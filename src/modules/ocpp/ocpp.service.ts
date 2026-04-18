import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FuelStation, ConnectorStatus, SessionStatus } from '@prisma/client';
import { FrontendGateway } from '../socket/frontend.gateway';
import { FuelSessionService } from '../fuel-session/fuel-session.service';

@Injectable()
export class OcppService {
    private readonly logger = new Logger(OcppService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly frontendGateway: FrontendGateway,
        @Inject(forwardRef(() => FuelSessionService))
        private readonly fuelSessionService: FuelSessionService,
    ) { }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Finds a FuelStation by its DB ID.
     */
    private async findStation(stationId: number): Promise<FuelStation | null> {
        const station = await this.prisma.fuelStation.findUnique({
            where: { id: stationId },
        });
        if (!station) {
            this.logger.warn(`Station with ID=${stationId} not found in DB.`);
        }
        return station;
    }

    /**
     * Finds a FuelPump using the station DB id and the OCPP fuelPumpNumber.
     */
    private async findFuelPump(stationDbId: number, fuelPumpNumber: number) {
        const fuelPump = await this.prisma.fuelPump.findUnique({
            where: {
                stationId_fuelPumpNumber: {
                    stationId: stationDbId,
                    fuelPumpNumber,
                },
            },
        });
        if (!fuelPump) {
            this.logger.warn(`Fuel pump #${fuelPumpNumber} not found for station ID=${stationDbId}.`);
        }
        return fuelPump;
    }

    // ─── Station Online/Offline Tracking (Logic kept for logging, but DB updates removed) ─

    public async handleStationConnected(stationId: number) {
        this.logger.log(`[ID=${stationId}] Station connected (WebSocket opened).`);
    }

    public async handleStationDisconnected(stationId: number) {
        this.logger.log(`[ID=${stationId}] Station disconnected (WebSocket closed).`);
    }

    // ─── OCPP Message Handlers ────────────────────────────────────────────────

    public async handleBootNotification(stationId: number, payload: any) {
        this.logger.log(`[ID=${stationId}] BootNotification: ${JSON.stringify(payload)}`);
        return {
            status: 'Accepted',
            currentTime: new Date().toISOString(),
            interval: 30,
        };
    }

    public async handleStatusNotification(stationId: number, payload: any) {
        this.logger.log(`[ID=${stationId}] StatusNotification: ${JSON.stringify(payload)}`);
        const { connectorId, status } = payload;

        if (connectorId && status) {
            const station = await this.findStation(stationId);
            if (!station) return {};

            const fuelPump = await this.findFuelPump(station.id, connectorId);
            if (!fuelPump) return {};

            try {
                const mappedStatus: ConnectorStatus = this.mapStatus(status);
                await this.prisma.fuelPump.update({
                    where: { id: fuelPump.id },
                    data: { status: mappedStatus },
                });

                await this.prisma.fuelPumpStatusLog.create({
                    data: {
                        status: mappedStatus,
                        fuelPumpId: fuelPump.id,
                        timestamp: new Date(),
                    },
                });

                this.frontendGateway.emitFuelPumpStatus(stationId.toString(), connectorId, status);
            } catch (error) {
                this.logger.error(`Failed to update pump #${connectorId} status on station ID=${stationId}: ${error.message}`);
            }
        }
        return {};
    }

    public async handleHeartbeat(stationId: number, payload: any) {
        this.logger.debug(`[ID=${stationId}] Heartbeat`);
        return { currentTime: new Date().toISOString() };
    }

    public async handleStartTransaction(stationId: number, payload: any) {
        this.logger.log(`[ID=${stationId}] StartTransaction: ${JSON.stringify(payload)}`);
        const { connectorId, idTag, timestamp } = payload;

        try {
            const station = await this.findStation(stationId);
            if (!station) return { transactionId: 0, idTagInfo: { status: 'Rejected' } };

            const fuelPump = await this.findFuelPump(station.id, connectorId);
            if (!fuelPump) return { transactionId: 0, idTagInfo: { status: 'Rejected' } };

            const userId = parseInt(idTag) || 1;
            const existingSession = await this.prisma.fuelSession.findFirst({
                where: {
                    fuelPumpId: fuelPump.id,
                    userId,
                    status: SessionStatus.DISPENSING,
                },
                orderBy: { startTime: 'desc' },
            });

            const session = existingSession
                ? await this.prisma.fuelSession.update({
                    where: { id: existingSession.id },
                    data: { startTime: new Date(timestamp || Date.now()) },
                })
                : await this.prisma.fuelSession.create({
                    data: {
                        fuelStationId: station.id,
                        fuelPumpId: fuelPump.id,
                        fuelTypeId: 1,
                        status: SessionStatus.DISPENSING,
                        quantity: 0,
                        totalAmount: 0,
                        startTime: new Date(timestamp || Date.now()),
                        userId: userId,
                    },
                });

            return { transactionId: session.id, idTagInfo: { status: 'Accepted' } };
        } catch (e) {
            this.logger.error(`Failed StartTransaction: ${e.message}`);
            return { transactionId: 0, idTagInfo: { status: 'Rejected' } };
        }
    }

    public async handleMeterValues(stationId: number, payload: any) {
        const { transactionId, meterValue } = payload;
        if (!transactionId || !meterValue || !Array.isArray(meterValue)) return {};

        const latestSample = meterValue[meterValue.length - 1];
        if (latestSample && latestSample.sampledValue) {
            let totalVolume = 0;
            for (const sample of latestSample.sampledValue) {
                if (sample.measurand === 'Volume.Active.Import') totalVolume = parseFloat(sample.value);
                if (sample.measurand === 'Energy.Active.Import.Register') totalVolume = parseFloat(sample.value) / 1000;
            }

            const session = await this.prisma.fuelSession.findUnique({
                where: { id: transactionId },
                include: { fuelPump: { include: { fuels: { include: { fuelType: true } } } } },
            });
            if (!session) return {};

            const fuelFuel = session.fuelPump.fuels.find(f => f.fuelTypeId === session.fuelTypeId);
            const price = fuelFuel ? fuelFuel.price : 2000;

            try {
                const currentSession = await this.prisma.fuelSession.update({
                    where: { id: transactionId },
                    data: { quantity: totalVolume, totalAmount: totalVolume * price },
                });
                this.frontendGateway.emitSessionMeterUpdated(transactionId, totalVolume, 0, currentSession.totalAmount);
            } catch (e) {
                this.logger.error(`Error updating fuel session meter for tx ${transactionId}`);
            }
        }
        return {};
    }

    public async handleStopTransaction(stationId: number, payload: any) {
        this.logger.log(`[ID=${stationId}] StopTransaction: ${JSON.stringify(payload)}`);
        const { transactionId, meterStop, timestamp } = payload;

        try {
            const finalVolume = meterStop ? meterStop / 1000 : 0;
            const session = await this.prisma.fuelSession.findUnique({
                where: { id: transactionId },
                include: { fuelPump: { include: { fuels: true } } },
            });
            if (!session) return { idTagInfo: { status: 'Rejected' } };

            const fuelFuel = session.fuelPump.fuels.find(f => f.fuelTypeId === session.fuelTypeId);
            const price = fuelFuel ? fuelFuel.price : 2000;
            const finalAmount = finalVolume * price;

            const updated = await this.prisma.fuelSession.update({
                where: { id: transactionId },
                data: {
                    status: SessionStatus.COMPLETED,
                    endTime: new Date(timestamp || Date.now()),
                    quantity: finalVolume > 0 ? finalVolume : undefined,
                    totalAmount: finalAmount > 0 ? finalAmount : undefined,
                },
            });

            this.fuelSessionService.processAutoPayment(updated.id);
        } catch (e) {
            this.logger.error(`Error stopping transaction ${transactionId}: ${e.message}`);
        }
        return { idTagInfo: { status: 'Accepted' } };
    }

    public handleIncomingCallResult(stationId: number, messageId: string, payload: any) {
        this.logger.debug(`[ID=${stationId}] Received CALLRESULT for msg ${messageId}:`, payload);
    }

    private mapStatus(status: string): ConnectorStatus {
        switch (status) {
            case 'Available':
                return ConnectorStatus.AVAILABLE;
            case 'Occupied':
            case 'Charging':
            case 'Preparing':
            case 'SuspendedEV':
                return ConnectorStatus.OCCUPIED;
            case 'Faulted':
            case 'Unavailable':
                return ConnectorStatus.OUT_OF_SERVICE;
            default:
                return ConnectorStatus.AVAILABLE;
        }
    }
}

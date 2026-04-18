import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import { OcppService } from './ocpp.service';

@Injectable()
export class OcppServer implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OcppServer.name);
    private wss: WebSocket.Server;

    // Active connections mapped by database stationId (number)
    private activeConnections: Map<number, WebSocket> = new Map();

    constructor(private readonly ocppService: OcppService) { }

    onModuleInit() {
        this.startServer();
    }

    onModuleDestroy() {
        this.stopServer();
    }

    private startServer() {
        // Start WebSocket server on port from env
        const PORT = process.env.OCPP_PORT ? parseInt(process.env.OCPP_PORT, 10) : 9051;
        this.wss = new WebSocket.Server({ port: PORT });

        this.logger.log(`OCPP WebSocket Server listening on ws://localhost:${PORT}/ocpp/:id`);

        this.wss.on('connection', (ws: WebSocket, req) => {
            // Extract numeric id from the URL, e.g., /ocpp/1
            const defaultPathMatch = req.url?.match(/\/ocpp\/([^\/]+)/);
            const stationIdStr = defaultPathMatch ? defaultPathMatch[1] : null;
            const stationId = stationIdStr ? parseInt(stationIdStr, 10) : NaN;

            if (isNaN(stationId)) {
                this.logger.error(`Invalid station ID connected: ${stationIdStr}`);
                ws.close();
                return;
            }

            this.logger.log(`Station Connected: ID=${stationId}`);
            this.activeConnections.set(stationId, ws);

            // Mark station online (Logic in service handleStationConnected)
            this.ocppService.handleStationConnected(stationId).catch(e =>
                this.logger.error(`Failed to handle connection for station ${stationId}: ${e.message}`)
            );

            ws.on('message', async (data: WebSocket.Data) => {
                try {
                    const messageArray = JSON.parse(data.toString());
                    if (!Array.isArray(messageArray)) throw new Error("Invalid format. Expected Array");

                    const messageTypeId = messageArray[0];
                    if (messageTypeId === 2) { // CALL
                        const [, messageId, action, payload] = messageArray;
                        await this.handleIncomingCall(ws, stationId, messageId, action, payload);
                    } else if (messageTypeId === 3) { // CALLRESULT
                        const [, messageId, payload] = messageArray;
                        this.ocppService.handleIncomingCallResult(stationId, messageId, payload);
                    }
                } catch (error) {
                    this.logger.error(`Error processing message from ID=${stationId}: ${error.message}`);
                }
            });

            ws.on('close', () => {
                this.logger.log(`Station Disconnected: ID=${stationId}`);
                this.activeConnections.delete(stationId);
                this.ocppService.handleStationDisconnected(stationId).catch(e =>
                    this.logger.error(`Failed to handle disconnect for station ${stationId}: ${e.message}`)
                );
            });

            ws.on('error', (error) => {
                this.logger.error(`WebSocket Error from ID=${stationId}: ${error.message}`);
            });
        });
    }

    private async handleIncomingCall(ws: WebSocket, stationId: number, messageId: string, action: string, payload: any) {
        this.logger.debug(`[ID=${stationId}] Received CALL: ${action}`, payload);
        try {
            let responsePayload = {};
            switch (action) {
                case 'BootNotification':
                    responsePayload = await this.ocppService.handleBootNotification(stationId, payload);
                    break;
                case 'StatusNotification':
                    responsePayload = await this.ocppService.handleStatusNotification(stationId, payload);
                    break;
                case 'Heartbeat':
                    responsePayload = await this.ocppService.handleHeartbeat(stationId, payload);
                    break;
                case 'StartTransaction':
                    responsePayload = await this.ocppService.handleStartTransaction(stationId, payload);
                    break;
                case 'MeterValues':
                    responsePayload = await this.ocppService.handleMeterValues(stationId, payload);
                    break;
                case 'StopTransaction':
                    responsePayload = await this.ocppService.handleStopTransaction(stationId, payload);
                    break;
                default:
                    this.logger.warn(`[ID=${stationId}] Unknown OCPP action: ${action}`);
            }

            // Send Response (Type 3 CALLRESULT)
            ws.send(JSON.stringify([3, messageId, responsePayload]));
        } catch (error) {
            this.logger.error(`[ID=${stationId}] Error handling ${action}: ${error.message}`);
        }
    }

    public async sendCallToStation(stationId: number, action: string, payload: any): Promise<void> {
        const ws = this.activeConnections.get(stationId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error(`Station with ID=${stationId} is not connected.`);
        }

        const messageId = Math.random().toString(36).substring(2, 10);
        const request = [2, messageId, action, payload];

        ws.send(JSON.stringify(request));
        this.logger.debug(`[ID=${stationId}] Sent CALL: ${action}`);
    }

    private stopServer() {
        if (this.wss) {
            this.wss.clients.forEach(client => client.terminate());
            this.wss.close();
            this.logger.log('OCPP WebSocket Server stopped.');
        }
    }
}

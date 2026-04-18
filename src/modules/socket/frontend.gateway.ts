import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true }) // runs on default HTTP port alongside API
export class FrontendGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(FrontendGateway.name);

    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        this.logger.log('Frontend Socket.io Gateway Initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.debug(`Frontend Client Connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.debug(`Frontend Client Disconnected: ${client.id}`);
    }

    /**
     * Broadcasts fuel pump status changes to mobile apps or dashboard
     */
    public emitFuelPumpStatus(stationId: string, fuelPumpId: number, status: string) {
        this.server.emit('pump_status_changed', { stationId, fuelPumpId, status });
    }

    /**
     * Broadcasts meter values to update fuel animations
     */
    public emitSessionMeterUpdated(transactionId: number, quantity: number, powerW: number, totalAmount: number) {
        this.server.emit('session_meter_updated', {
            sessionId: transactionId,
            quantity,
            powerKw: powerW / 1000,
            totalAmount,
        });
    }
}

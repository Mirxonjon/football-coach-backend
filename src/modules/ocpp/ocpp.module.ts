import { Module, forwardRef } from '@nestjs/common';
import { OcppService } from './ocpp.service';
import { OcppServer } from './ocpp.server';
import { FuelSessionModule } from '../fuel-session/fuel-session.module';
import { FuelPumpModule } from '../fuel-pump/fuel-pump.module';
import { SocketModule } from '../socket/socket.module';

@Module({
    imports: [
        forwardRef(() => FuelSessionModule),
        FuelPumpModule,
        SocketModule
    ],
    providers: [OcppService, OcppServer],
    exports: [OcppService, OcppServer],
})
export class OcppModule { }

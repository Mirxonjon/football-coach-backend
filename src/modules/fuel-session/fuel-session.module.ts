import { Module, forwardRef } from '@nestjs/common';
import { FuelSessionService } from './fuel-session.service';
import { FuelSessionController } from './fuel-session.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { OcppModule } from '../ocpp/ocpp.module';
import { ClickModule } from '../click/click.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    forwardRef(() => OcppModule),
    ClickModule
  ],
  providers: [FuelSessionService],
  controllers: [FuelSessionController],
  exports: [FuelSessionService],
})
export class FuelSessionModule { }

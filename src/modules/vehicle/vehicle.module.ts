import { Module } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { VehicleController } from './vehicle.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { VehicleCronService } from './vehicle.cron';

@Module({
  imports: [PrismaModule],
  providers: [VehicleService, VehicleCronService],
  controllers: [VehicleController],
  exports: [VehicleService],
})
export class VehicleModule {}

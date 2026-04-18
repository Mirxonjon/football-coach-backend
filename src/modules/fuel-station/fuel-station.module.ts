import { Module } from '@nestjs/common';
import { FuelStationService } from './fuel-station.service';
import { FuelStationController } from './fuel-station.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FuelStationService],
  controllers: [FuelStationController],
  exports: [FuelStationService],
})
export class FuelStationModule {}

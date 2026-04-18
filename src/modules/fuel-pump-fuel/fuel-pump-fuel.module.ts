import { Module } from '@nestjs/common';
import { FuelPumpFuelService } from './fuel-pump-fuel.service';
import { FuelPumpFuelController } from './fuel-pump-fuel.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  providers: [FuelPumpFuelService],
  controllers: [FuelPumpFuelController],
  exports: [FuelPumpFuelService],
})
export class FuelPumpFuelModule {}

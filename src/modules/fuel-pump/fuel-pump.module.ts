import { Module } from '@nestjs/common';
import { FuelPumpService } from './fuel-pump.service';
import { FuelPumpController } from './fuel-pump.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FuelPumpService],
  controllers: [FuelPumpController],
  exports: [FuelPumpService],
})
export class FuelPumpModule {}

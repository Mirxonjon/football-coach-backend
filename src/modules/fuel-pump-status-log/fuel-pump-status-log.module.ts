import { Module } from '@nestjs/common';
import { FuelPumpStatusLogService } from './fuel-pump-status-log.service';
import { FuelPumpStatusLogController } from './fuel-pump-status-log.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FuelPumpStatusLogService],
  controllers: [FuelPumpStatusLogController],
  exports: [FuelPumpStatusLogService],
})
export class FuelPumpStatusLogModule {}

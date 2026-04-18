import { Module } from '@nestjs/common';
import { FuelStationLikeController } from './station-like.controller';
import { FuelStationLikeService } from './station-like.service';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FuelStationLikeController],
  providers: [FuelStationLikeService],
  exports: [FuelStationLikeService],
})
export class FuelStationLikeModule {}

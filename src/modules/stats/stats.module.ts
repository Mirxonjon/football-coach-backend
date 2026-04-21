import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { StatsService } from './stats.service';
import { StatsAdminController } from './stats.admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StatsAdminController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}

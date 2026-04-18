import { Module } from '@nestjs/common';
import { CronJobService } from './cron.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),

  ],
  providers: [CronJobService],
  exports: [CronJobService],
})
export class CronJobModule {}

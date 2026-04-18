import { Module } from '@nestjs/common';
import { CronJobService } from './cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ScheduleModule.forRoot(),

  ],
  providers: [CronJobService],
  exports: [CronJobService],
})
export class CronJobModule {}

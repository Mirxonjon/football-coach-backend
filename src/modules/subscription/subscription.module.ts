import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionCron } from './subscription.cron';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { NotificationModule } from '@/modules/notification/notification.module';

@Module({
  imports: [PrismaModule, PaymentsModule, NotificationModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionCron],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}

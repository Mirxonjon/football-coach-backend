import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  dbConfig,
  minioConfig,
  openAIConfig,
} from './common/config/app.config';
import { APP_FILTER } from '@nestjs/core';
import { CronJobModule } from './common/cron/cron.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AllExceptionFilter } from './common/filter/all-exceptions.filter';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LegalModule } from './modules/legal/legal.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SocketModule } from './modules/socket/socket.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BooksModule } from './modules/books/books.module';
import { TrainingModule } from './modules/training/training.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { SubscriptionPlanModule } from './modules/subscription-plan/subscription-plan.module';
import { HealthModule } from './modules/health/health.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, minioConfig, openAIConfig],
    }),
    PrismaModule,
    CronJobModule,
    AuthModule,
    UsersModule,
    LegalModule,
    NotificationModule,
    SocketModule,
    TelegramModule,
    PaymentsModule,
    BooksModule,
    TrainingModule,
    AiChatModule,
    SubscriptionModule,
    SubscriptionPlanModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  async onModuleInit() {}
}

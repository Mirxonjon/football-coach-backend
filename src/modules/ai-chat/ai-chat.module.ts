import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../../common/services/minio/minio.module';
import { NotificationModule } from '../notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, MinioModule, NotificationModule, ScheduleModule.forRoot()],
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}

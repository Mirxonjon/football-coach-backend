import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { DeviceController } from './device.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { FirebaseAdminService } from './firebase-admin.service';

@Module({
  imports: [PrismaModule],
  providers: [NotificationService, FirebaseAdminService],
  controllers: [NotificationController, DeviceController],
  exports: [NotificationService],
})
export class NotificationModule {}

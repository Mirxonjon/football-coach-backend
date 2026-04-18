import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { FirebaseAdminService } from './firebase-admin.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [NotificationService, FirebaseAdminService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}

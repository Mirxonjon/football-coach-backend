import { Module } from '@nestjs/common';
import { StorageModule } from '@/common/services/storage/storage.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { UploadAdminController } from './upload.admin.controller';

@Module({
  imports: [StorageModule, PrismaModule],
  controllers: [UploadAdminController],
})
export class UploadModule {}

import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { MinioService } from './minio.service';

@Module({
  imports: [StorageModule],
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}

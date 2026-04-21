import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { r2Config } from '@/common/config/app.config';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(r2Config)],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

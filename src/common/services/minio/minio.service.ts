import { Injectable, Logger } from '@nestjs/common';
import { StorageService, UploadFolder } from '../storage/storage.service';

/**
 * Thin compatibility shim over StorageService (Cloudflare R2).
 * Kept so existing callers (e.g. ai-chat) continue to work unchanged.
 */
@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly storage: StorageService) {}

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    return this.storage.uploadFile(file, this.normalizeFolder(folder));
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.storage.deleteFile(filePath);
  }

  getPublicUrl(filePath: string): string {
    return this.storage.getPublicUrl(filePath);
  }

  private normalizeFolder(folder: string): UploadFolder {
    const allowed: UploadFolder[] = [
      'videos',
      'images',
      'books',
      'konspekts',
      'avatars',
      'ai-chat',
      'misc',
    ];
    return (allowed.includes(folder as UploadFolder)
      ? folder
      : 'misc') as UploadFolder;
  }
}

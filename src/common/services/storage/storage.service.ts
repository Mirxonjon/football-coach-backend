import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { r2Config } from '@/common/config/app.config';

export type UploadFolder =
  | 'videos'
  | 'images'
  | 'books'
  | 'konspekts'
  | 'avatars'
  | 'ai-chat'
  | 'misc';

export type UploadedObject = {
  key: string;
  url: string;
  bucket: string;
  contentType: string;
  size: number;
  originalName: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(r2Config.KEY)
    private readonly config: ConfigType<typeof r2Config>,
  ) {
    this.bucket = config.bucketName;
    this.publicUrl = config.publicUrl.replace(/\/+$/, '');

    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: false,
    });

    void this.healthCheck();
  }

  private async healthCheck() {
    if (!this.config.accessKeyId || !this.config.endpoint) {
      this.logger.warn('R2 credentials not configured — uploads will fail.');
      return;
    }
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`R2 bucket "${this.bucket}" reachable`);
    } catch (e: any) {
      // Most object-scoped R2 tokens cannot HeadBucket — harmless; object ops still work.
      this.logger.log(
        `R2 configured for bucket "${this.bucket}" (HeadBucket skipped: ${e?.name ?? 'n/a'})`,
      );
    }
  }

  private buildKey(folder: UploadFolder, originalName: string): string {
    const ext = extname(originalName).toLowerCase();
    const id = randomUUID();
    const datePrefix = new Date().toISOString().slice(0, 10);
    return `${folder}/${datePrefix}/${id}${ext}`;
  }

  private toPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: UploadFolder,
    originalName: string,
    contentType: string,
  ): Promise<UploadedObject> {
    const key = this.buildKey(folder, originalName);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`,
      }),
    );

    return {
      key,
      url: this.toPublicUrl(key),
      bucket: this.bucket,
      contentType,
      size: buffer.length,
      originalName,
    };
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: UploadFolder = 'misc',
  ): Promise<string> {
    const uploaded = await this.uploadBuffer(
      file.buffer,
      folder,
      file.originalname,
      file.mimetype,
    );
    return uploaded.url;
  }

  async uploadFileDetailed(
    file: Express.Multer.File,
    folder: UploadFolder = 'misc',
  ): Promise<UploadedObject> {
    return this.uploadBuffer(
      file.buffer,
      folder,
      file.originalname,
      file.mimetype,
    );
  }

  async deleteByKey(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async deleteByUrl(url: string): Promise<void> {
    const key = this.urlToKey(url);
    if (!key) {
      this.logger.warn(`Cannot derive object key from url: ${url}`);
      return;
    }
    await this.deleteByKey(key);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (filePath.startsWith('http')) {
      return this.deleteByUrl(filePath);
    }
    return this.deleteByKey(filePath);
  }

  urlToKey(url: string): string | null {
    if (!url) return null;
    if (url.startsWith(this.publicUrl + '/')) {
      return url.slice(this.publicUrl.length + 1);
    }
    return null;
  }

  getPublicUrl(key: string): string {
    return this.toPublicUrl(key);
  }

  async getSignedDownloadUrl(key: string, expiresInSec = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresInSec });
  }

  async getSignedUploadUrl(
    folder: UploadFolder,
    originalName: string,
    contentType: string,
    expiresInSec = 900,
  ): Promise<{ key: string; url: string; publicUrl: string }> {
    const key = this.buildKey(folder, originalName);
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, cmd, {
      expiresIn: expiresInSec,
    });
    return { key, url, publicUrl: this.toPublicUrl(key) };
  }
}

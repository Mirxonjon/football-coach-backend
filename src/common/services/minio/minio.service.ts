import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MinioConfig } from '../../config/app.config';
import { CONFIG_MINIO_TOKEN } from '../../config/app.config';

@Injectable()
export class MinioService {
  private readonly minioClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly publicBucket: string;

  constructor(private readonly configService: ConfigService) {
    const minioConfig = this.configService.get<MinioConfig>(CONFIG_MINIO_TOKEN);

    this.minioClient = new Minio.Client({
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
    });

    this.bucketName = minioConfig.bucketName;
    this.publicUrl = minioConfig.publicUrl;
    this.publicBucket = minioConfig.publicBucket;

    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        // Set bucket policy to public read
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy)
        );
      }
    } catch (error) {
      this.logger.error('Error initializing MinIO bucket:', error);
      throw error;
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      const fileName = `${folder}/${Date.now()}-${file.originalname}`;
      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        }
      );
      return `${this.publicUrl}/${this.publicBucket}/${fileName}`;
    } catch (error) {
      this.logger.error('Error uploading file to MinIO:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fileName = filePath.replace(
        `${this.publicUrl}/${this.publicBucket}/`,
        ''
      );
      await this.minioClient.removeObject(this.bucketName, fileName);
    } catch (error) {
      this.logger.error('Error deleting file from MinIO:', error);
      throw error;
    }
  }

  getPublicUrl(filePath: string): string {
    return `${this.publicUrl}/${this.publicBucket}/${filePath}`;
  }
}

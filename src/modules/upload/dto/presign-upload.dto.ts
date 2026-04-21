import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const UPLOAD_FOLDERS = [
  'videos',
  'images',
  'books',
  'konspekts',
  'avatars',
  'ai-chat',
  'misc',
] as const;
export type UploadFolderName = (typeof UPLOAD_FOLDERS)[number];

export class PresignUploadDto {
  @ApiProperty({ enum: UPLOAD_FOLDERS, example: 'videos' })
  @IsEnum(UPLOAD_FOLDERS)
  folder: UploadFolderName;

  @ApiProperty({ example: 'lesson-01.mp4' })
  @IsString()
  originalName: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType: string;

  @ApiPropertyOptional({ example: 900, description: 'Signed URL TTL (seconds), max 3600' })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresInSec?: number;
}

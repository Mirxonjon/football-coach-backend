import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class AdminSendUserDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'Yangilanish' })
  @IsString()
  @IsNotEmpty()
  titleUz: string;

  @ApiProperty({ example: 'Обновление' })
  @IsString()
  @IsNotEmpty()
  titleRu: string;

  @ApiProperty({ example: 'Yangi dars qoshildi' })
  @IsString()
  @IsNotEmpty()
  messageUz: string;

  @ApiProperty({ example: 'Добавлен новый урок' })
  @IsString()
  @IsNotEmpty()
  messageRu: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.SYSTEM })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ example: 42, description: 'Related entity id (lesson/book/etc.)' })
  @IsOptional()
  @IsInt()
  relatedId?: number;

  @ApiPropertyOptional({ example: { lessonId: 42 } })
  @IsOptional()
  data?: Record<string, any>;
}

export class AdminSendManyDto {
  @ApiProperty({ example: [1, 2, 3], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  userIds: number[];

  @ApiProperty({ example: 'Yangilanish' })
  @IsString()
  @IsNotEmpty()
  titleUz: string;

  @ApiProperty({ example: 'Обновление' })
  @IsString()
  @IsNotEmpty()
  titleRu: string;

  @ApiProperty({ example: 'Yangi dars qoshildi' })
  @IsString()
  @IsNotEmpty()
  messageUz: string;

  @ApiProperty({ example: 'Добавлен новый урок' })
  @IsString()
  @IsNotEmpty()
  messageRu: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.SYSTEM })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  relatedId?: number;

  @ApiPropertyOptional({ example: { lessonId: 42 } })
  @IsOptional()
  data?: Record<string, any>;
}

export class AdminBroadcastDto {
  @ApiProperty({ example: 'Tizim yangilanishi' })
  @IsString()
  @IsNotEmpty()
  titleUz: string;

  @ApiProperty({ example: 'Системное обновление' })
  @IsString()
  @IsNotEmpty()
  titleRu: string;

  @ApiProperty({ example: 'Barcha foydalanuvchilar uchun yangi imkoniyatlar' })
  @IsString()
  @IsNotEmpty()
  messageUz: string;

  @ApiProperty({ example: 'Новые возможности для всех пользователей' })
  @IsString()
  @IsNotEmpty()
  messageRu: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.SYSTEM })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  relatedId?: number;

  @ApiPropertyOptional({ example: { version: '1.2.0' } })
  @IsOptional()
  data?: Record<string, any>;
}

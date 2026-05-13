import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BlockType } from '@prisma/client';

export class CreateLessonBlockDto {
  @ApiProperty({ enum: BlockType })
  @IsEnum(BlockType)
  blockType: BlockType;

  @ApiProperty()
  @IsString()
  contentUz: string;

  @ApiProperty()
  @IsString()
  contentRu: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  sequenceOrder: number;

  @ApiPropertyOptional({
    description: 'If true, this block is viewable without an active subscription (preview).',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
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
}

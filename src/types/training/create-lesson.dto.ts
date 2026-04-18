import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  trainingCategoryId: number;

  @ApiProperty({ example: 'Lesson title UZ' })
  @IsString()
  titleUz: string;

  @ApiProperty({ example: 'Lesson title RU' })
  @IsString()
  titleRu: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  sequenceOrder: number;

  @ApiProperty()
  @IsString()
  descriptionUz: string;

  @ApiProperty()
  @IsString()
  descriptionRu: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tacticHintImg?: string;
}

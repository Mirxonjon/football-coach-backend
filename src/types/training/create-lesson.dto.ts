import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'If true, the entire lesson is free to view without an active subscription.',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFree?: boolean;
}

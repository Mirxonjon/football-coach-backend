import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum TrainingCategorySortBy {
  id = 'id',
  createdAt = 'createdAt',
  lessonCount = 'lessonCount',
}

export enum TrainingCategorySortOrder {
  asc = 'asc',
  desc = 'desc',
}

export enum CategoryProgressStatus {
  not_started = 'not_started',
  in_progress = 'in_progress',
  completed = 'completed',
}

export class FilterTrainingCategoryDto {
  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Return all items without pagination (skips meta).',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  all?: boolean;

  @ApiPropertyOptional({ description: 'Filter by age category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageCategoryId?: number;

  @ApiPropertyOptional({
    description: 'Search by title or description (UZ/RU, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: TrainingCategorySortBy,
    description:
      'Sort field. id = creation order, createdAt = exact timestamp, lessonCount = by lesson count.',
    default: TrainingCategorySortBy.id,
  })
  @IsOptional()
  @IsEnum(TrainingCategorySortBy)
  sortBy?: TrainingCategorySortBy;

  @ApiPropertyOptional({
    enum: TrainingCategorySortOrder,
    description: 'Sort direction. desc = newest/highest first.',
    default: TrainingCategorySortOrder.desc,
  })
  @IsOptional()
  @IsEnum(TrainingCategorySortOrder)
  sortOrder?: TrainingCategorySortOrder;

  @ApiPropertyOptional({
    description: 'true → only categories that have at least one lesson.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasLessons?: boolean;

  @ApiPropertyOptional({
    description:
      'true → response items will include `lessonCount` (number of lessons in the category).',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCount?: boolean;

  @ApiPropertyOptional({
    enum: CategoryProgressStatus,
    description:
      'Filter categories by current user progress (requires auth):\n' +
      '• not_started — no lesson in this category has any progress for the user\n' +
      '• in_progress — at least one lesson is started/uncompleted (the user can resume)\n' +
      '• completed — every lesson in this category is completed by the user',
  })
  @IsOptional()
  @IsEnum(CategoryProgressStatus)
  progressStatus?: CategoryProgressStatus;
}

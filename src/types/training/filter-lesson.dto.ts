import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum LessonSortBy {
  id = 'id',
  createdAt = 'createdAt',
}

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export enum LessonProgressStatus {
  not_started = 'not_started',
  in_progress = 'in_progress',
  completed = 'completed',
}

export class FilterLessonDto {
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

  @ApiPropertyOptional({ description: 'Filter by training category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  trainingCategoryId?: number;

  @ApiPropertyOptional({ description: 'Filter by age category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageCategoryId?: number;

  @ApiPropertyOptional({ description: 'Search by lesson title (UZ/RU)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'true → only free lessons (isFree=true)',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({
    description:
      'true → only lessons the current user can view (free for everyone, or every lesson for active subscribers / admins).',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unlocked?: boolean;

  @ApiPropertyOptional({
    enum: LessonSortBy,
    description: 'Sort field. id = creation order, createdAt = exact timestamp.',
    default: LessonSortBy.id,
  })
  @IsOptional()
  @IsEnum(LessonSortBy)
  sortBy?: LessonSortBy;

  @ApiPropertyOptional({
    enum: SortOrder,
    description: 'Sort direction. desc = newest first, asc = oldest first.',
    default: SortOrder.desc,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({
    enum: LessonProgressStatus,
    description:
      'Filter by current user progress: not_started | in_progress | completed.',
  })
  @IsOptional()
  @IsEnum(LessonProgressStatus)
  progressStatus?: LessonProgressStatus;

  @ApiPropertyOptional({
    description: 'true → only lessons that contain at least one VIDEO block.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasVideo?: boolean;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BookCategoryType } from '@prisma/client';

export enum BookSortBy {
  id = 'id',
  createdAt = 'createdAt',
  basePrice = 'basePrice',
}

export enum BookSortOrder {
  asc = 'asc',
  desc = 'desc',
}

export class FilterBookDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ enum: BookCategoryType })
  @IsOptional()
  @IsEnum(BookCategoryType)
  categoryType?: BookCategoryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: BookSortBy,
    description: 'Sort field. id / createdAt / basePrice.',
    default: BookSortBy.id,
  })
  @IsOptional()
  @IsEnum(BookSortBy)
  sortBy?: BookSortBy;

  @ApiPropertyOptional({
    enum: BookSortOrder,
    description: 'Sort direction. desc = newest/highest first.',
    default: BookSortOrder.desc,
  })
  @IsOptional()
  @IsEnum(BookSortOrder)
  sortOrder?: BookSortOrder;

  @ApiPropertyOptional({
    description: 'true → only books that have a discount (discountType !== "NONE").',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasDiscount?: boolean;

  @ApiPropertyOptional({
    description: 'true → only free books (basePrice == 0).',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFree?: boolean;
}

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

export enum MasterclassCategorySortBy {
  id = 'id',
  createdAt = 'createdAt',
  masterclassCount = 'masterclassCount',
}

export enum MasterclassCategorySortOrder {
  asc = 'asc',
  desc = 'desc',
}

export class FilterMasterclassCategoryDto {
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

  @ApiPropertyOptional({
    description: 'Search by titleUz/titleRu (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: MasterclassCategorySortBy,
    description: 'Sort field. id / createdAt / masterclassCount.',
    default: MasterclassCategorySortBy.id,
  })
  @IsOptional()
  @IsEnum(MasterclassCategorySortBy)
  sortBy?: MasterclassCategorySortBy;

  @ApiPropertyOptional({
    enum: MasterclassCategorySortOrder,
    description: 'Sort direction. desc = newest/highest first.',
    default: MasterclassCategorySortOrder.desc,
  })
  @IsOptional()
  @IsEnum(MasterclassCategorySortOrder)
  sortOrder?: MasterclassCategorySortOrder;

  @ApiPropertyOptional({
    description: 'true → only categories that have at least one masterclass.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasMasterclasses?: boolean;

  @ApiPropertyOptional({
    description: 'true → response items will include `masterclassCount`.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCount?: boolean;
}

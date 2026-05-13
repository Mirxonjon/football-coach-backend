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

export enum MasterclassSortBy {
  id = 'id',
  createdAt = 'createdAt',
}

export enum MasterclassSortOrder {
  asc = 'asc',
  desc = 'desc',
}

export class FilterMasterclassDto {
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

  @ApiPropertyOptional({ description: 'Filter by masterclass category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  masterclassCategoryId?: number;

  @ApiPropertyOptional({ description: 'Search by titleUz/titleRu (case-insensitive)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: MasterclassSortBy,
    description: 'Sort field. id / createdAt.',
    default: MasterclassSortBy.id,
  })
  @IsOptional()
  @IsEnum(MasterclassSortBy)
  sortBy?: MasterclassSortBy;

  @ApiPropertyOptional({
    enum: MasterclassSortOrder,
    description: 'Sort direction. desc = newest first.',
    default: MasterclassSortOrder.desc,
  })
  @IsOptional()
  @IsEnum(MasterclassSortOrder)
  sortOrder?: MasterclassSortOrder;
}

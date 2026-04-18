import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export class CarFilterDto {
  @ApiPropertyOptional({ example: 'Tesla' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 2018 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearFrom?: number;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearTo?: number;

  @ApiPropertyOptional({ example: 'model' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 12, description: 'Filter by creator userId' })
  @IsOptional()
  @IsInt()
  createdById?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Sort by: year | createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: 'year' | 'createdAt' = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', description: 'asc | desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

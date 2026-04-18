import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConnectorStatus, FuelCategory } from '@prisma/client';

export enum FuelFilterCategory {
  PETROL = 'PETROL',
  GAS = 'GAS',
  PROPANE = 'PROPANE',
  ELECTRICITY = 'ELECTRICITY',
  GAS_AND_PROPANE = 'GAS_AND_PROPANE'
}

export class FilterFuelStationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;
  
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  operatorId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 40.7128 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: -74.006 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  fuelType_id?: number;

  @ApiPropertyOptional({ enum: ConnectorStatus })
  @IsOptional()
  @IsEnum(ConnectorStatus)
  pumpStatus?: ConnectorStatus;

  @ApiPropertyOptional({ example: 'Downtown Station' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number;
  @ApiPropertyOptional({ enum: FuelFilterCategory })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value.split(',').map(v => v.trim())))
  @IsEnum(FuelFilterCategory, { each: true })
  category?: FuelFilterCategory[];

  @ApiPropertyOptional({ example: ['95'] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value.split(',').map(v => v.trim())))
  @IsString({ each: true })
  octane?: string[];
}



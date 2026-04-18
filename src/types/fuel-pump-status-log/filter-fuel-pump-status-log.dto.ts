import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorStatus } from '@prisma/client';

export class FilterFuelPumpStatusLogDto {
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fuelPumpId?: number;

  @ApiPropertyOptional({ enum: ConnectorStatus })
  @IsOptional()
  @IsEnum(ConnectorStatus)
  status?: ConnectorStatus;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  to?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';

export class CashierStatsFilterDto {
  @ApiProperty({ required: false, example: '2024-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ required: false, example: '2024-12-31' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  fuelStationId?: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDiscountDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  fuelStationId: number;


  @ApiPropertyOptional({ example: 10, description: 'Percentage discount (0-100], mutually exclusive with fixedPrice' })
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  @Max(100)
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  percent?: number;

  @ApiPropertyOptional({ example: '1200.00', description: 'Fixed price discount, mutually exclusive with percent' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : value.toString()))
  fixedPrice?: string;

  @ApiProperty({ example: '2026-02-15T08:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-02-16T08:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  isActive?: boolean;
}

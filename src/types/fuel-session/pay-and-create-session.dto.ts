import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { Unit } from '@prisma/client';

export class PayAndCreateSessionDto {
  @ApiProperty({ example: 1, description: 'Saved Click card ID to charge' })
  @Type(() => Number)
  @IsInt()
  cardId: number;

  @ApiProperty({ example: 50000, description: 'Amount to charge (UZS)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  fuelStationId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  fuelPumpId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  fuelTypeId: number;

  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ enum: Unit, example: Unit.LITRE })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricePerUnit?: number;
}

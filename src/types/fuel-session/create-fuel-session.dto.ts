import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SessionStatus, Unit } from '@prisma/client';

export class CreateFuelSessionDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'User ID for whom the session is created',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

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

  @ApiPropertyOptional({ example: 45.5 })
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

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  paymentId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Saved Click card ID to charge. If omitted, the user\'s most recently added active card is used.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cardId?: number;

  @ApiPropertyOptional({ enum: SessionStatus, default: SessionStatus.PENDING })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ example: '2026-02-14T05:30:00.000Z' })
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-02-14T07:00:00.000Z' })
  @IsOptional()
  endTime?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PayoutStatus } from '@prisma/client';

export class CreateOperatorPayoutDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  operatorId: number;

  @ApiProperty({ example: 1234.56 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'UZS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: PayoutStatus, default: PayoutStatus.PENDING })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  periodFrom?: string;

  @ApiPropertyOptional({ example: '2026-01-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  periodTo?: string;

  @ApiPropertyOptional({ example: '2026-02-01T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  paidAt?: string;
}

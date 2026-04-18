import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorStatus } from '@prisma/client';

export class CreateFuelPumpDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  stationId: number;


  @ApiPropertyOptional({ enum: ConnectorStatus, default: ConnectorStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(ConnectorStatus)
  status?: ConnectorStatus;

  @ApiProperty({
    example: 1,
    description: 'Fuel pump number.',
  })
  @Type(() => Number)
  @IsNumber()
  fuelPumpNumber: number;

  @ApiPropertyOptional({ description: 'Optional QR code token' })
  @IsOptional()
  qrCode?: string;
}

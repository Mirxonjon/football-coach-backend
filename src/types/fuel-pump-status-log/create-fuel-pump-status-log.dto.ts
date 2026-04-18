import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorStatus } from '@prisma/client';

export class CreateFuelPumpStatusLogDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  fuelPumpId: number;

  @ApiProperty({ enum: ConnectorStatus })
  @IsEnum(ConnectorStatus)
  @IsNotEmpty()
  status: ConnectorStatus;
}

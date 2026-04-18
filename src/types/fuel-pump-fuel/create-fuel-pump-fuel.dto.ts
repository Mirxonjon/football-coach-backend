import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFuelPumpFuelDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  fuelPumpId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  fuelTypeId: number;

  @ApiProperty({ example: 12000 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price: number;
}

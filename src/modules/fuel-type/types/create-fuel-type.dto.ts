import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum } from 'class-validator';
import { Unit, FuelCategory } from '@prisma/client';

export class CreateFuelTypeDto {
  @ApiProperty({
    description: 'Name of the fuel type',
    example: 'Benzin AI-95',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Octane rating (if applicable)',
    example: 95,
  })
  @IsString()
  @IsOptional()
  octane?: string;

  @ApiProperty({
    description: 'Unit of measurement',
    enum: Unit,
    example: Unit.LITRE,
  })
  @IsEnum(Unit)
  unit: Unit;

  @ApiPropertyOptional({
    description: 'Category of the fuel type',
    enum: FuelCategory,
    example: FuelCategory.PETROL,
  })
  @IsOptional()
  @IsEnum(FuelCategory)
  category?: FuelCategory;

  @ApiPropertyOptional({
    description: 'Picture URL of the fuel type',
    example: 'https://example.com/images/gas.png',
  })
  @IsString()
  @IsOptional()
  picture?: string;
}

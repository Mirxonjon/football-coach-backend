import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, Min, Max, IsNumber, IsEnum } from 'class-validator';

export class CreateCarDto {

  @ApiProperty({ example: 'Tesla' })
  @IsNotEmpty()
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Model 3' })
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiPropertyOptional({ example: 2023 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  // @ApiPropertyOptional({ example: '5YJ3E1EA7JF000000' })
  // @IsOptional()
  // @IsString()
  // vin?: string;

  @ApiPropertyOptional({ example: 'https://images.example.com/cars/tesla-model-3.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

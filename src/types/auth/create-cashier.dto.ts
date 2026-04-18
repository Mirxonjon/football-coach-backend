import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCashierDto {
  @ApiProperty({ example: '+998900000001' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ example: 'Cashier123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: [1, 2], description: 'List of Fuel Station IDs assigned to the cashier' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  stationIds?: number[];
}

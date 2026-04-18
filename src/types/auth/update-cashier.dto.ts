import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength, IsArray, IsInt } from 'class-validator';

export class UpdateCashierDto {
  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Invalid phone format' })
  phone?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: 'Ali' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: [1, 2], description: 'List of Fuel Station IDs assigned to the cashier' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  stationIds?: number[];
}

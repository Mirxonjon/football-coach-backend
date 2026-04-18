import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFuelStationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  operatorId: number;

  @ApiProperty({ example: 'Main Street Station' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 40.7128 })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -74.006 })
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/image.png' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: '24/7' })
  @IsOptional()
  @IsString()
  workingHours?: string;

  @ApiPropertyOptional({
    example: 'CP001',
    description: 'OCPP identity used in the WebSocket URL (if applicable)',
  })
  @IsOptional()
  @IsString()
  ocppStationId?: string;
}

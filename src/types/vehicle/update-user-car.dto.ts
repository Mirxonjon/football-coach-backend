import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserCarDto {
    @ApiPropertyOptional({ example: '01A123AA' })
    @IsOptional()
    @IsString()
    plateNumber?: string;

    @ApiPropertyOptional({ example: '1ZVBP8AM2E5123456' })
    @IsOptional()
    @IsString()
    vin?: string;

    @ApiPropertyOptional({ example: '#FFFFFF' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    carId?: number;
}

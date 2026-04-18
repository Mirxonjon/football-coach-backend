import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class RemoteStartSessionDto {
    @ApiProperty({
        example: 1,
        description: 'ID of the fuel pump to fuel on',
    })
    @Type(() => Number)
    @IsInt()
    fuelPumpId: number;

    @ApiPropertyOptional({
        example: 3,
        description: 'ID of the user car being fueled (optional, for tracking purposes)',
    })
    @Type(() => Number)
    @IsInt()
    userCarId?: number;
}

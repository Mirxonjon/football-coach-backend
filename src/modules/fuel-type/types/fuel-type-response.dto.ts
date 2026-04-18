import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';

export class FuelTypeResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'AI-95' })
    name: string;

    @ApiPropertyOptional({ example: '95', nullable: true })
    octane: string | null;

    @ApiProperty({ enum: Unit, example: Unit.LITRE })
    unit: Unit;

    @ApiPropertyOptional({ example: 'https://example.com/images/gas.png', nullable: true })
    picture: string | null;

    @ApiProperty({ example: '2024-03-03T12:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2024-03-03T12:00:00.000Z' })
    updatedAt: Date;
}

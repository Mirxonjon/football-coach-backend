import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SessionStatus } from '@prisma/client';

export class UpdateFuelSessionStatusDto {
    @ApiProperty({ enum: SessionStatus, example: SessionStatus.DISPENSING })
    @IsEnum(SessionStatus)
    status: SessionStatus;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleLikeResponseDto {
  @ApiProperty({ example: true, description: 'Current like state after toggle' })
  @IsBoolean()
  liked!: boolean;
}

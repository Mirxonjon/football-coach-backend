import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateLessonProgressDto {
  @ApiProperty({ description: 'Sequence order of the block the user has reached', example: 3 })
  @IsInt()
  @Min(0)
  lastBlockSequence: number;
}

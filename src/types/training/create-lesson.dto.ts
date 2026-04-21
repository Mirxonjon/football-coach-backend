import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  trainingCategoryId: number;

  @ApiProperty({ example: 'Lesson title UZ' })
  @IsString()
  titleUz: string;

  @ApiProperty({ example: 'Lesson title RU' })
  @IsString()
  titleRu: string;
}

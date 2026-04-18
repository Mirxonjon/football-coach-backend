import { PartialType } from '@nestjs/swagger';
import { CreateLessonBlockDto } from './create-lesson-block.dto';

export class UpdateLessonBlockDto extends PartialType(CreateLessonBlockDto) {}

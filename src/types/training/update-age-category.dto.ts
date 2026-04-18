import { PartialType } from '@nestjs/swagger';
import { CreateAgeCategoryDto } from './create-age-category.dto';

export class UpdateAgeCategoryDto extends PartialType(CreateAgeCategoryDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateMasterclassCategoryDto } from './create-masterclass-category.dto';

export class UpdateMasterclassCategoryDto extends PartialType(
  CreateMasterclassCategoryDto,
) {}

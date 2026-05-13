import { PartialType } from '@nestjs/swagger';
import { CreateMasterclassBlockDto } from './create-masterclass-block.dto';

export class UpdateMasterclassBlockDto extends PartialType(
  CreateMasterclassBlockDto,
) {}

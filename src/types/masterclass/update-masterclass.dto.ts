import { PartialType } from '@nestjs/swagger';
import { CreateMasterclassDto } from './create-masterclass.dto';

export class UpdateMasterclassDto extends PartialType(CreateMasterclassDto) {}

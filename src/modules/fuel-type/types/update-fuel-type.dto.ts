import { PartialType } from '@nestjs/swagger';
import { CreateFuelTypeDto } from './create-fuel-type.dto';

export class UpdateFuelTypeDto extends PartialType(CreateFuelTypeDto) { }

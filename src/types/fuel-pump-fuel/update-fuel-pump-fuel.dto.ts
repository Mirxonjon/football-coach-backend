import { PartialType } from '@nestjs/swagger';
import { CreateFuelPumpFuelDto } from './create-fuel-pump-fuel.dto';

export class UpdateFuelPumpFuelDto extends PartialType(CreateFuelPumpFuelDto) {}

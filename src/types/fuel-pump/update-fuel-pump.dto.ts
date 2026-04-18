import { PartialType } from '@nestjs/swagger';
import { CreateFuelPumpDto } from './create-fuel-pump.dto';

export class UpdateFuelPumpDto extends PartialType(CreateFuelPumpDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateFuelSessionDto } from './create-fuel-session.dto';

export class UpdateFuelSessionDto extends PartialType(CreateFuelSessionDto) {}

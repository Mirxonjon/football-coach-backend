import { PartialType } from '@nestjs/swagger';
import { CreateOperatorPayoutDto } from './create-operator-payout.dto';

export class UpdateOperatorPayoutDto extends PartialType(CreateOperatorPayoutDto) {}

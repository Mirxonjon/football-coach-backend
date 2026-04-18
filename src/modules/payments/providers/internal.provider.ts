import { Injectable } from '@nestjs/common';
import { PaymentProvider, ChargeResult } from './payment-provider.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class InternalPaymentProvider implements PaymentProvider {
  readonly name = 'internal';

  async charge(_amount: number, _cardToken: string): Promise<ChargeResult> {
    return { success: true, externalId: `internal_${randomUUID()}` };
  }
}

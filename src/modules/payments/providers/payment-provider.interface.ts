export interface ChargeResult {
  success: boolean;
  externalId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(amount: number, cardToken: string): Promise<ChargeResult>;
}

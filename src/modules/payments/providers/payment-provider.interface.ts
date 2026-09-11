export interface ChargeResult {
  success: boolean;
  externalId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentProvider {
  readonly name: string;
  /**
   * `transactionParam` — bizning WalletTransaction.id imiz. Provayderga
   * o'zgarmas kalit sifatida uzatiladi, shunda tarmoq uzilib qayta
   * urinilganda bir to'lov ikki marta yechilmaydi.
   */
  charge(
    amount: number,
    cardToken: string,
    transactionParam: string,
  ): Promise<ChargeResult>;
}

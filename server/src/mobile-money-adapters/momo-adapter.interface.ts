/**
 * Per-operator Mobile Money connector (TDS §1 payment_attempts, §8). Distinct
 * from provider-adapters: this is the fiat rail (Buy = incoming payment,
 * Sell = outgoing payout), not the crypto liquidity provider.
 */

export type MomoStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'UNKNOWN';

export interface MomoInitiationResult {
  status: MomoStatus;
  providerReference?: string;
}

export interface MomoAdapter {
  readonly name: string;

  supports(operator: string, country: string): boolean;

  /** Buy: incoming payment request pushed to the client's phone (USSD/push). */
  initiatePayment(params: {
    idempotencyKey: string;
    operator: string;
    phoneNumber: string;
    amount: number;
    currency: string;
  }): Promise<MomoInitiationResult>;

  /** Sell: outgoing payout to the client's phone. */
  initiatePayout(params: {
    idempotencyKey: string;
    operator: string;
    phoneNumber: string;
    amount: number;
    currency: string;
  }): Promise<MomoInitiationResult>;

  getPaymentStatus(providerReference: string): Promise<{ status: MomoStatus }>;
}

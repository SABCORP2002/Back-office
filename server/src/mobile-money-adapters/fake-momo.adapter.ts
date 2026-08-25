import { Injectable, Logger } from '@nestjs/common';
import { MomoAdapter, MomoInitiationResult, MomoStatus } from './momo-adapter.interface';

/**
 * Local-dev/test stand-in — no real operator (MTN, Orange, ...) is under
 * contract yet. Same test-scenario markers as FakeProviderAdapter:
 * `FORCE_FAIL_IMMEDIATE`, `FORCE_TIMEOUT` embedded in the idempotency key.
 */
@Injectable()
export class FakeMomoAdapter implements MomoAdapter {
  readonly name = 'FakeMomoAdapter';
  private readonly logger = new Logger(FakeMomoAdapter.name);
  private readonly payments = new Map<string, MomoStatus>();

  supports(): boolean {
    return true; // dev fake: accepts every operator/country combination
  }

  async initiatePayment(params: {
    idempotencyKey: string;
    operator: string;
    phoneNumber: string;
    amount: number;
    currency: string;
  }): Promise<MomoInitiationResult> {
    return this.simulate(params.idempotencyKey);
  }

  async initiatePayout(params: {
    idempotencyKey: string;
    operator: string;
    phoneNumber: string;
    amount: number;
    currency: string;
  }): Promise<MomoInitiationResult> {
    return this.simulate(params.idempotencyKey);
  }

  async getPaymentStatus(providerReference: string): Promise<{ status: MomoStatus }> {
    return { status: this.payments.get(providerReference) ?? 'UNKNOWN' };
  }

  private async simulate(idempotencyKey: string): Promise<MomoInitiationResult> {
    const providerReference = `fake-momo-${idempotencyKey}`;

    if (idempotencyKey.includes('FORCE_FAIL_IMMEDIATE')) {
      this.payments.set(providerReference, 'FAILED');
      this.logger.warn(`[fake] payment ${providerReference} refused (forced scenario)`);
      return { status: 'FAILED', providerReference };
    }

    if (idempotencyKey.includes('FORCE_TIMEOUT')) {
      this.payments.set(providerReference, 'CONFIRMED');
      this.logger.warn(`[fake] payment ${providerReference} actually confirmed server-side, simulating a client timeout`);
      throw new Error('ETIMEDOUT (simulated) — caller must treat this as UNKNOWN, not a confirmed failure');
    }

    this.payments.set(providerReference, 'CONFIRMED');
    return { status: 'PENDING', providerReference };
  }
}

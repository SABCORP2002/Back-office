import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MomoAdapter, MomoInitiationResult, MomoStatus } from './momo-adapter.interface';

/**
 * Paydunya — West African Mobile Money aggregator. Auth here is
 * header-based (master/private key + token on every request, no separate
 * login call) — real credentials are configured
 * (`PAYDUNYA_MASTER_KEY`/`PAYDUNYA_PRIVATE_KEY`/`PAYDUNYA_TOKEN`, and note
 * the private key is `live_...`, a production credential). The actual
 * collect/payout endpoint paths and payload shapes aren't documented here,
 * so `initiatePayment`/`initiatePayout`/`getPaymentStatus` deliberately
 * throw rather than guess.
 */
@Injectable()
export class PaydunyaAdapter implements MomoAdapter {
  readonly name = 'Paydunya';
  /** Documented public coverage — not yet cross-checked against a real account's enabled countries. */
  private static readonly COVERED_COUNTRIES = ['Sénégal', 'Côte d’Ivoire', 'Bénin', 'Togo', 'Mali', 'Burkina Faso'];

  constructor(private readonly config: ConfigService) {}

  supports(operator: string, country: string): boolean {
    return PaydunyaAdapter.COVERED_COUNTRIES.includes(country);
  }

  /** Real header shape, reusable by whichever real request implementation comes next. */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': this.config.getOrThrow<string>('PAYDUNYA_MASTER_KEY'),
      'PAYDUNYA-PRIVATE-KEY': this.config.getOrThrow<string>('PAYDUNYA_PRIVATE_KEY'),
      'PAYDUNYA-TOKEN': this.config.getOrThrow<string>('PAYDUNYA_TOKEN'),
    };
  }

  private notImplemented(method: string): never {
    throw new NotImplementedException(`PaydunyaAdapter.${method}() — pending Paydunya collect/payout API documentation`);
  }

  async initiatePayment(): Promise<MomoInitiationResult> {
    this.notImplemented('initiatePayment');
  }

  async initiatePayout(): Promise<MomoInitiationResult> {
    this.notImplemented('initiatePayout');
  }

  async getPaymentStatus(): Promise<{ status: MomoStatus }> {
    this.notImplemented('getPaymentStatus');
  }
}

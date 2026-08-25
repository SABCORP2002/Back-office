import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NormalizedStatus,
  ProviderAdapter,
  ProviderFees,
  ProviderLimits,
  ProviderOrderResult,
  ProviderQuote,
} from './provider-adapter.interface';

/**
 * Yellow Card — real crypto liquidity provider credentials are configured
 * (`YELLOWCARD_PUBLIC_KEY`/`YELLOWCARD_SECRET_KEY` in `.env`, never
 * committed — TDS §14). What was provided is the key pair only, with no
 * endpoint/request-signing documentation, so every transactional method
 * below is a deliberate `NotImplementedException` rather than a guessed
 * request shape against a real liquidity provider — TDS §11 exists
 * precisely so a wrong guess here can't silently move real funds.
 *
 * TODO once Yellow Card's API reference is available: implement
 * `quote()`/`createOrder()`/`getTransactionStatus()`/etc. against their
 * real endpoints and request-signing scheme, then flip this adapter
 * `active` in a seeded `ProviderConfig` row (see prisma/seed.ts) to put it
 * in front of routing.selectProvider().
 */
@Injectable()
export class YellowCardAdapter implements ProviderAdapter {
  readonly name = 'YellowCard';
  private readonly logger = new Logger(YellowCardAdapter.name);

  constructor(private readonly config: ConfigService) {}

  private get publicKey(): string {
    return this.config.getOrThrow<string>('YELLOWCARD_PUBLIC_KEY');
  }

  private get secretKey(): string {
    return this.config.getOrThrow<string>('YELLOWCARD_SECRET_KEY');
  }

  private notImplemented(method: string): never {
    this.logger.error(`YellowCardAdapter.${method}() called — no API reference on file yet, refusing to guess at a money-moving request.`);
    throw new NotImplementedException(`YellowCardAdapter.${method}() — pending Yellow Card API documentation`);
  }

  async quote(): Promise<ProviderQuote> {
    this.notImplemented('quote');
  }

  async createOrder(): Promise<ProviderOrderResult> {
    this.notImplemented('createOrder');
  }

  async getTransactionStatus(): Promise<{ status: NormalizedStatus; rawStatus: string; txHash?: string }> {
    this.notImplemented('getTransactionStatus');
  }

  async getSupportedCountries(): Promise<string[]> {
    this.notImplemented('getSupportedCountries');
  }

  async getCurrencies(): Promise<string[]> {
    this.notImplemented('getCurrencies');
  }

  async getCryptos(): Promise<string[]> {
    this.notImplemented('getCryptos');
  }

  async getNetworks(): Promise<string[]> {
    this.notImplemented('getNetworks');
  }

  async getLimits(): Promise<ProviderLimits> {
    this.notImplemented('getLimits');
  }

  async getFees(): Promise<ProviderFees> {
    this.notImplemented('getFees');
  }

  async getPaymentCapabilities(): Promise<string[]> {
    this.notImplemented('getPaymentCapabilities');
  }

  async generateDepositAddress(): Promise<{ address: string }> {
    this.notImplemented('generateDepositAddress');
  }

  async healthCheck(): Promise<'UP' | 'DEGRADED' | 'DOWN'> {
    // Credentials are configured but unverified against a real endpoint —
    // reporting DOWN is the honest answer until this is actually wired up.
    return this.publicKey && this.secretKey ? 'DEGRADED' : 'DOWN';
  }
}

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MomoAdapter, MomoInitiationResult, MomoStatus } from './momo-adapter.interface';

/**
 * Tranzak — Cameroon Mobile Money aggregator. Real credentials are
 * configured (`TRANZAK_APP_ID`/`TRANZAK_APP_KEY` in `.env` — note the key
 * is `PROD_...`, a live production credential, not sandbox). The token
 * endpoint below is real and documented; the actual collect/payout
 * endpoints are not, so `initiatePayment`/`initiatePayout`/
 * `getPaymentStatus` deliberately throw rather than guess at a
 * money-moving request shape.
 *
 * TODO once Tranzak's collect/payout API reference is available:
 * implement those three methods for real, then move this adapter ahead of
 * FakeMomoAdapter in MomoAdapterRegistry.onModuleInit() so
 * `supports('Cameroun')` requests actually resolve to it.
 */
@Injectable()
export class TranzakAdapter implements MomoAdapter {
  readonly name = 'Tranzak';
  private readonly logger = new Logger(TranzakAdapter.name);
  private readonly authUrl = 'https://dsapi.tranzak.me/auth/token';
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Coverage is a documented assumption (Tranzak is Cameroon-focused), not confirmed against their docs yet. */
  supports(operator: string, country: string): boolean {
    return country === 'Cameroun';
  }

  /**
   * Real, documented endpoint. Not called automatically anywhere in this
   * codebase — only invoked once a real collect/payout method needs a
   * token, so no live call happens just from the app booting.
   */
  private async authenticate(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) return this.cachedToken.value;

    const appId = this.config.getOrThrow<string>('TRANZAK_APP_ID');
    const appKey = this.config.getOrThrow<string>('TRANZAK_APP_KEY');

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appKey }),
    });
    if (!response.ok) {
      throw new Error(`Tranzak auth failed: ${response.status} ${await response.text()}`);
    }
    const body = (await response.json()) as Record<string, unknown>;
    const token = extractToken(body);
    if (!token) {
      this.logger.error(`Tranzak auth response had no recognizable token field: ${JSON.stringify(body)}`);
      throw new Error('Tranzak auth succeeded but no token field was found in the response — check the response shape');
    }
    // Conservative default TTL since the real expiry field is unconfirmed.
    this.cachedToken = { value: token, expiresAt: Date.now() + 10 * 60_000 };
    return token;
  }

  private notImplemented(method: string): never {
    throw new NotImplementedException(`TranzakAdapter.${method}() — pending Tranzak collect/payout API documentation`);
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

function extractToken(body: Record<string, unknown>): string | undefined {
  const candidates = [body.token, body.accessToken, (body.data as Record<string, unknown> | undefined)?.token, (body.data as Record<string, unknown> | undefined)?.accessToken];
  return candidates.find((c): c is string => typeof c === 'string');
}

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MomoAdapter, MomoInitiationResult, MomoStatus } from './momo-adapter.interface';

/**
 * Elyonpay — role in the architecture is unconfirmed (treated as a
 * MomoAdapter per the "Yellow Card = crypto, everything else = Mobile
 * Money" mapping, pending explicit confirmation of what Elyonpay actually
 * covers). Real login credentials are configured
 * (`ELYONPAY_USERNAME`/`ELYONPAY_PASSWORD`) — note this is a plaintext
 * email+password login, not an API key pair; that credential should be
 * rotated if it was ever a reused personal password.
 *
 * `supports()` deliberately returns `false` until coverage is confirmed —
 * this adapter is registered but inert by default, so it can't
 * accidentally get selected for a real transaction before anyone has
 * verified what it actually does.
 */
@Injectable()
export class ElyonpayAdapter implements MomoAdapter {
  readonly name = 'Elyonpay';
  private readonly logger = new Logger(ElyonpayAdapter.name);
  private readonly loginUrl = 'https://api.elyonpay.org/api/login';
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  supports(): boolean {
    // TODO confirm Elyonpay's supported countries/operators before flipping this on.
    return false;
  }

  /** Real, documented endpoint. Not called from anywhere else in this codebase yet. */
  private async authenticate(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) return this.cachedToken.value;

    const username = this.config.getOrThrow<string>('ELYONPAY_USERNAME');
    const password = this.config.getOrThrow<string>('ELYONPAY_PASSWORD');

    const response = await fetch(this.loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role: 'ROLE_MERCHANT_ADMIN' }),
    });
    if (!response.ok) {
      throw new Error(`Elyonpay login failed: ${response.status} ${await response.text()}`);
    }
    const body = (await response.json()) as Record<string, unknown>;
    const token = extractToken(body);
    if (!token) {
      this.logger.error(`Elyonpay login response had no recognizable token field: ${JSON.stringify(body)}`);
      throw new Error('Elyonpay login succeeded but no token field was found in the response — check the response shape');
    }
    this.cachedToken = { value: token, expiresAt: Date.now() + 10 * 60_000 };
    return token;
  }

  private notImplemented(method: string): never {
    throw new NotImplementedException(`ElyonpayAdapter.${method}() — pending Elyonpay API documentation and confirmed role`);
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

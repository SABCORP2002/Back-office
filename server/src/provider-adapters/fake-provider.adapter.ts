import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  NormalizedStatus,
  ProviderAdapter,
  ProviderFees,
  ProviderLimits,
  ProviderOrderResult,
  ProviderQuote,
} from './provider-adapter.interface';

/**
 * Local-dev/test stand-in for a real liquidity provider (Yellow Card,
 * Izichange, ...) — none is under contract yet (TDS §12/§19 marks these
 * values CONFIGURABLE). Implements the exact TDS §11 contract so swapping in
 * a real adapter later is a matter of writing one more class, not touching
 * routing/transaction-engine.
 *
 * Test-scenario control: pass an idempotency key containing one of these
 * markers to force a specific branch of Arch §3's three-way failover logic:
 *   - `FORCE_FAIL_IMMEDIATE` -> createOrder returns JAL_FAILED synchronously (échec confirmé)
 *   - `FORCE_TIMEOUT`        -> createOrder throws (simulated network timeout -> JAL_UNKNOWN)
 *                               a later getTransactionStatus resolves JAL_SUCCESS,
 *                               mirroring Arch §2.2's "operation actually succeeded,
 *                               JAL just didn't know yet" example.
 * Anything else resolves JAL_SUCCESS immediately.
 */
const MOCK_MARKET_RATES: Record<string, number> = {
  BTC: 65_000_000,
  ETH: 3_500_000,
  USDT: 650,
  USDC: 650,
};

interface FakeOrderState {
  status: NormalizedStatus;
  rawStatus: string;
  txHash?: string;
}

@Injectable()
export class FakeProviderAdapter implements ProviderAdapter {
  readonly name = 'FakeProvider';
  private readonly logger = new Logger(FakeProviderAdapter.name);
  private readonly orders = new Map<string, FakeOrderState>();

  async quote(params: { crypto: string; network: string; fiatCurrency: string; amount: number }): Promise<ProviderQuote> {
    const rate = MOCK_MARKET_RATES[params.crypto] ?? 1;
    return { providerRate: rate, fees: 0, expiresAt: new Date(Date.now() + 60_000) };
  }

  async createOrder(params: {
    idempotencyKey: string;
    direction: 'BUY_SEND' | 'SELL_RECEIVE';
    crypto: string;
    network: string;
    amount: number;
    destination: string;
  }): Promise<ProviderOrderResult> {
    const providerOrderId = `fake-${params.idempotencyKey}`;

    if (params.idempotencyKey.includes('FORCE_FAIL_IMMEDIATE')) {
      this.orders.set(providerOrderId, { status: 'JAL_FAILED', rawStatus: 'REJECTED_BY_FAKE_PROVIDER' });
      this.logger.warn(`[fake] order ${providerOrderId} rejected (forced scenario)`);
      return { providerOrderId, status: 'JAL_FAILED' };
    }

    if (params.idempotencyKey.includes('FORCE_TIMEOUT')) {
      // Simulate the provider having actually accepted the order server-side
      // even though the HTTP call to us is about to "time out".
      const txHash = `fake-tx-${randomBytes(8).toString('hex')}`;
      this.orders.set(providerOrderId, { status: 'JAL_SUCCESS', rawStatus: 'COMPLETED', txHash });
      this.logger.warn(`[fake] order ${providerOrderId} accepted server-side, simulating a client timeout`);
      throw new Error('ETIMEDOUT (simulated) — caller must treat this as JAL_UNKNOWN, not a confirmed failure');
    }

    const txHash = `fake-tx-${randomBytes(8).toString('hex')}`;
    this.orders.set(providerOrderId, { status: 'JAL_SUCCESS', rawStatus: 'COMPLETED', txHash });
    return { providerOrderId, status: 'JAL_SUCCESS', txHash };
  }

  async getTransactionStatus(params: { providerOrderId: string }): Promise<{ status: NormalizedStatus; rawStatus: string; txHash?: string }> {
    const found = this.orders.get(params.providerOrderId);
    if (!found) return { status: 'JAL_UNKNOWN', rawStatus: 'NOT_FOUND' };
    return found;
  }

  async getSupportedCountries(): Promise<string[]> {
    return ['Cameroun', 'Sénégal', 'Côte d’Ivoire'];
  }

  async getCurrencies(): Promise<string[]> {
    return ['XAF', 'XOF'];
  }

  async getCryptos(): Promise<string[]> {
    return Object.keys(MOCK_MARKET_RATES);
  }

  async getNetworks(crypto: string): Promise<string[]> {
    return crypto === 'USDT' || crypto === 'USDC' ? ['TRC20', 'ERC20', 'BEP20'] : [crypto === 'BTC' ? 'Bitcoin' : 'ERC20'];
  }

  async getLimits(): Promise<ProviderLimits> {
    return { min: 5, max: 5000 };
  }

  async getFees(): Promise<ProviderFees> {
    return { fixed: 0, variablePct: 0 };
  }

  async getPaymentCapabilities(): Promise<string[]> {
    return ['MTN Mobile Money', 'Orange Money'];
  }

  async generateDepositAddress(params: { crypto: string; network: string }): Promise<{ address: string }> {
    return { address: `FAKE-DEPOSIT-${params.network}-${randomBytes(6).toString('hex')}` };
  }

  async refund(_params: { providerOrderId: string; amount: number }): Promise<{ status: NormalizedStatus }> {
    return { status: 'JAL_SUCCESS' };
  }

  async healthCheck(): Promise<'UP' | 'DEGRADED' | 'DOWN'> {
    return 'UP';
  }
}

import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ChainWatcher, DetectedDeposit } from './watcher.interface';

/**
 * Local-dev/test stand-in for a real chain watcher. Confirmations advance
 * deterministically per call (not on a real timer) so a smoke test doesn't
 * have to wait out TDS §12's real-world 15–45 minute windows.
 *
 * `simulateDeposit()` is the dev-only hook standing in for "the client sent
 * crypto from their external wallet" (SELL-009) — nothing in production code
 * calls it; only scripts/smoke-buy.ts and tests do.
 */
export class FakeChainWatcher implements ChainWatcher {
  private readonly deposits = new Map<string, DetectedDeposit>();
  private readonly confirmationCalls = new Map<string, number>();

  constructor(
    public readonly network: string,
    private readonly config: ConfigService,
  ) {}

  simulateDeposit(address: string, amount: number): DetectedDeposit {
    const txHash = `fake-tx-${randomBytes(8).toString('hex')}`;
    const deposit = { txHash, amountDetected: amount, confirmations: 0 };
    this.deposits.set(address, deposit);
    return deposit;
  }

  async detectIncoming(params: { address: string }): Promise<DetectedDeposit | null> {
    return this.deposits.get(params.address) ?? null;
  }

  async getConfirmations(txHash: string): Promise<number> {
    const calls = (this.confirmationCalls.get(txHash) ?? 0) + 1;
    this.confirmationCalls.set(txHash, calls);
    // +4 confirmations per poll so a smoke test converges in a handful of calls.
    return calls * 4;
  }

  requiredConfirmations(): number {
    const key = `CONFIRMATIONS_${this.network}` as const;
    return Number(this.config.get(key) ?? 15);
  }
}

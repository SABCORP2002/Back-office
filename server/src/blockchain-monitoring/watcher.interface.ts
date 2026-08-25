/**
 * TDS §12 — per-network confirmation tracking. No real RPC/provider is
 * chosen yet (CONFIGURABLE, pending sandbox validation with whichever
 * provider ends up under contract). This interface is deliberately narrow:
 * detection/confirmation-counting only — broadcasting an outgoing BUY send
 * is the Provider Adapter's job (the liquidity provider custodies and sends
 * the crypto), not this module's.
 */
export interface DetectedDeposit {
  txHash: string;
  amountDetected: number;
  confirmations: number;
}

export interface ChainWatcher {
  readonly network: string;

  /** Polls for a deposit landing on a SELL flow's generated address. Null if nothing seen yet. */
  detectIncoming(params: { address: string }): Promise<DetectedDeposit | null>;

  /** Confirmation count for any hash — used for both SELL incoming and BUY outgoing tracking. */
  getConfirmations(txHash: string): Promise<number>;

  /** TDS §12 — sandbox-pending thresholds (20/15/15 for TRC20/ERC20/BEP20 as Proposition V1). */
  requiredConfirmations(): number;
}

/**
 * TDS §11 — every liquidity provider (Yellow Card, Izichange, ...) implements
 * this exact interface. "Le fournisseur s'adapte à JAL — jamais l'inverse."
 * The core engine (transaction-engine, routing-engine, pricing-engine) only
 * ever talks to this interface, never to a provider's native SDK/API shape.
 */

export type NormalizedStatus = 'JAL_PENDING' | 'JAL_SUCCESS' | 'JAL_FAILED' | 'JAL_UNKNOWN';

export interface ProviderQuote {
  providerRate: number;
  fees: number;
  expiresAt: Date;
}

export interface ProviderOrderResult {
  providerOrderId: string;
  status: NormalizedStatus;
  /** Present once the provider has actually broadcast on-chain — not always known synchronously. */
  txHash?: string;
}

export interface ProviderLimits {
  min: number;
  max: number;
}

export interface ProviderFees {
  fixed: number;
  variablePct: number;
}

export interface ProviderAdapter {
  /** Matches ProviderConfig.name — used by the registry and by routing decisions. */
  readonly name: string;

  quote(params: { crypto: string; network: string; fiatCurrency: string; amount: number }): Promise<ProviderQuote>;

  /**
   * TDS §11's `createOrder()` — always called behind an idempotency key
   * (Arch §2). The provider is expected to return the existing order if it
   * recognizes the key and supports idempotency itself; otherwise JAL's own
   * `idempotency_keys` table is the source of truth (common/idempotency.service.ts).
   */
  createOrder(params: {
    idempotencyKey: string;
    direction: 'BUY_SEND' | 'SELL_RECEIVE';
    crypto: string;
    network: string;
    amount: number;
    destination: string;
  }): Promise<ProviderOrderResult>;

  /**
   * TDS §11.1 — the four-way normalization every adapter must guarantee.
   * An unrecognized provider-native status is always JAL_UNKNOWN, never
   * defaulted to success or failure (test scenario 15).
   */
  getTransactionStatus(params: { providerOrderId: string }): Promise<{ status: NormalizedStatus; rawStatus: string; txHash?: string }>;

  getSupportedCountries(): Promise<string[]>;
  getCurrencies(): Promise<string[]>;
  getCryptos(): Promise<string[]>;
  getNetworks(crypto: string): Promise<string[]>;
  getLimits(crypto: string, currency: string): Promise<ProviderLimits>;
  getFees(crypto: string, currency: string, amount: number): Promise<ProviderFees>;
  getPaymentCapabilities(country: string): Promise<string[]>;

  /**
   * Not itemized as a separate TDS §11 method, but implied by
   * ProviderOrderDirection.SELL_RECEIVE and Arch §5.2/UX §7's "adresse de
   * dépôt générée pour le réseau choisi" at SELL commande créée — the
   * receiving provider is who actually custodies the incoming crypto for
   * the brief SELL_RECEIVE window, so it's who must hand out the address.
   * Real provider mechanics here are provider-specific and unverified
   * (CONFIGURABLE) until one is under contract.
   */
  generateDepositAddress(params: { crypto: string; network: string }): Promise<{ address: string }>;

  /** Only present "quand la capacité existe côté fournisseur" (TDS §11) — may be unimplemented. */
  refund?(params: { providerOrderId: string; amount: number }): Promise<{ status: NormalizedStatus }>;

  healthCheck(): Promise<'UP' | 'DEGRADED' | 'DOWN'>;
}

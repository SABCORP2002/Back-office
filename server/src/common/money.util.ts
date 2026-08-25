import { Decimal } from '@prisma/client/runtime/library';

/**
 * Rounding rules (Arch §7, TDS §19): "arrondi mathématique standard à la
 * décimale de la crypto/devise concernée, jamais systématiquement en faveur
 * de JAL" — standard half-up rounding, never biased toward JAL. Decimal
 * places are asset-specific and documented here in one place so no two call
 * sites can silently disagree (the spec calls this out explicitly as a
 * requirement, not a suggestion).
 */
export const DECIMAL_PLACES: Record<string, number> = {
  // Fiat currencies used in V1 (Mobile Money corridors) — zero-decimal.
  XAF: 0,
  XOF: 0,
  // Crypto — asset-specific, not network-specific (USDT is 6dp regardless of
  // TRC20/ERC20/BEP20 in practice; adjust per real provider precision once
  // one is under contract, per TDS §12's CONFIGURABLE note).
  BTC: 8,
  ETH: 8,
  USDT: 6,
  USDC: 6,
};

export function decimalPlacesFor(assetOrCurrency: string): number {
  return DECIMAL_PLACES[assetOrCurrency] ?? 8;
}

/** Standard half-up rounding — never a hidden thumb on the scale. */
export function roundAsset(value: Decimal | number | string, assetOrCurrency: string): Decimal {
  const places = decimalPlacesFor(assetOrCurrency);
  return new Decimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

/** Absolute + relative tolerance check for TDS §7's provider-price-drift rule. */
export function withinTolerance(a: Decimal | number | string, b: Decimal | number | string, tolerancePct: number): boolean {
  const da = new Decimal(a);
  const db = new Decimal(b);
  if (db.isZero()) return da.isZero();
  const diffPct = da.minus(db).abs().div(db.abs()).mul(100);
  return diffPct.lessThanOrEqualTo(tolerancePct);
}

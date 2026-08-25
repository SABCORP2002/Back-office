import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { TxType } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { roundAsset, withinTolerance } from '../common/money.util';

export interface RateComponents {
  crypto: string;
  network: string;
  fiatCurrency: string;
  direction: TxType;
  country: string;
  providerRate: Decimal | number | string;
}

export interface QuotedRate {
  providerRate: Decimal;
  marginPct: Decimal;
  feeFixed: Decimal;
  jalRateClient: Decimal;
}

/**
 * Arch §7 + §14 pricing pipeline: Provider Cost/Quote -> JAL Pricing Engine
 * -> Marge + frais -> JAL Customer Quote. This module never talks to a
 * provider directly (that would create a cycle with routing/provider
 * adapters) — the caller (transaction-engine) resolves a provider rate first
 * and hands it in. The client only ever sees `jalRateClient`; provider cost
 * and margin are back-office-only (UX §14, TXN-003 field-visibility table).
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Non-persisted preview for BUY-003/SELL-002 — indicative only, never locked (Arch §7). */
  async previewRate(input: RateComponents): Promise<QuotedRate> {
    const { marginPct, feeFixed } = await this.resolveMargin(input);
    return this.computeRate(input, marginPct, feeFixed);
  }

  /**
   * Creates the persisted, immutable-once-locked quote row (TDS §1 quotes
   * table). Called at BUY-010/SELL-007 recap generation, per Arch §7: "Au
   * moment de la génération du récapitulatif, pas avant".
   */
  async generateQuote(input: RateComponents) {
    const quoted = await this.previewRate(input);
    const validitySeconds = Number(this.config.get('QUOTE_VALIDITY_SECONDS') ?? 60);
    return this.prisma.quote.create({
      data: {
        crypto: input.crypto,
        network: input.network,
        fiatCurrency: input.fiatCurrency,
        providerRate: quoted.providerRate,
        jalMargin: quoted.jalRateClient.minus(quoted.providerRate).abs(),
        jalRateClient: quoted.jalRateClient,
        expiresAt: new Date(Date.now() + validitySeconds * 1000),
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Locks a quote — immuable dès verrouillage (TDS §1). Rejects an expired
   * quote (JAL-ERR-QUOTE-001) rather than silently reusing a stale rate.
   */
  async lockQuote(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException(`Quote ${quoteId} not found`);
    if (quote.status !== 'ACTIVE') {
      throw new BadRequestException(`Quote ${quoteId} is ${quote.status}, not ACTIVE — JAL-ERR-QUOTE-001`);
    }
    if (quote.expiresAt.getTime() < Date.now()) {
      await this.prisma.quote.update({ where: { id: quoteId }, data: { status: 'EXPIRED' } });
      throw new BadRequestException(`Quote ${quoteId} expired — JAL-ERR-QUOTE-001, generate a fresh quote`);
    }
    return this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'LOCKED', lockedAt: new Date() },
    });
  }

  /**
   * Arch §7: "Si le fournisseur modifie son prix après verrouillage — écart
   * absorbé dans une tolérance configurable ; au-delà, transaction basculée
   * en intervention plutôt qu'exécutée à un prix non maîtrisé." Called right
   * before the provider order is actually placed.
   */
  isWithinRateTolerance(lockedProviderRate: Decimal | number | string, currentProviderRate: Decimal | number | string): boolean {
    const tolerancePct = Number(this.config.get('RATE_TOLERANCE_PCT') ?? 0.5);
    return withinTolerance(lockedProviderRate, currentProviderRate, tolerancePct);
  }

  private async resolveMargin(input: RateComponents): Promise<{ marginPct: Decimal; feeFixed: Decimal }> {
    // Most specific match wins: country+crypto+direction > crypto+direction > direction > default.
    const candidates = await this.prisma.pricingConfig.findMany({
      where: {
        active: true,
        OR: [
          { country: input.country, crypto: input.crypto, direction: input.direction },
          { country: null, crypto: input.crypto, direction: input.direction },
          { country: null, crypto: null, direction: input.direction },
          { country: null, crypto: null, direction: null },
        ],
      },
    });
    const score = (c: (typeof candidates)[number]) =>
      (c.country ? 4 : 0) + (c.crypto ? 2 : 0) + (c.direction ? 1 : 0);
    const best = candidates.sort((a, b) => score(b) - score(a))[0];
    return {
      marginPct: best ? new Decimal(best.marginPct) : new Decimal(1.5), // Proposition V1 default
      feeFixed: best ? new Decimal(best.feeFixed) : new Decimal(0),
    };
  }

  private computeRate(input: RateComponents, marginPct: Decimal, feeFixed: Decimal): QuotedRate {
    const providerRate = new Decimal(input.providerRate);
    // BUY: client pays MORE per crypto unit than the provider rate (JAL markup).
    // SELL: client receives LESS per crypto unit than the provider rate.
    const jalRateClient =
      input.direction === 'achat'
        ? providerRate.mul(new Decimal(1).plus(marginPct.div(100)))
        : providerRate.mul(new Decimal(1).minus(marginPct.div(100)));

    return {
      providerRate,
      marginPct,
      feeFixed,
      jalRateClient: roundAsset(jalRateClient, input.fiatCurrency),
    };
  }
}

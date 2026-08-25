import { Injectable, Logger } from '@nestjs/common';
import { TxType } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ProviderAdapterRegistry } from '../provider-adapters/provider-adapter.registry';
import { PricingService } from './pricing.service';

/** UX §4.5 — ADM-PRICE-001…007. CRUD over the margin/fee configuration PricingService.resolveMargin() reads. */
@Injectable()
export class PricingConfigService {
  private readonly logger = new Logger(PricingConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerAdapters: ProviderAdapterRegistry,
    private readonly pricing: PricingService,
  ) {}

  list() {
    return this.prisma.pricingConfig.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** ADM-PRICE-001 "Cotations fournisseurs — Vue agrégée des taux/coûts reçus de chaque fournisseur, comparer en temps réel". */
  async compareProviderQuotes(input: { crypto: string; network: string; fiatCurrency: string; amount: number }) {
    const results = await Promise.all(
      this.providerAdapters.all().map(async (adapter) => {
        try {
          const quote = await adapter.quote(input);
          return { provider: adapter.name, providerRate: quote.providerRate, fees: quote.fees, expiresAt: quote.expiresAt, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`quote() failed for ${adapter.name}: ${message}`);
          return { provider: adapter.name, providerRate: null, fees: null, expiresAt: null, error: message };
        }
      }),
    );
    return results;
  }

  /**
   * ADM-PRICE-002 "Moteur de pricing JAL — Vue d'ensemble : taux fournisseur
   * + frais + marge = taux client". The admin-only counterpart to the
   * client-facing `/quotes/preview` — that endpoint deliberately hides
   * providerRate/marginPct/feeFixed (UX §15 field-visibility); this one is
   * the back-office view where exposing them is exactly the point.
   */
  async rateBreakdown(input: { crypto: string; network: string; fiatCurrency: string; direction: TxType; country: string; providerRate: number }) {
    return this.pricing.previewRate(input);
  }

  create(input: { country?: string; crypto?: string; direction?: TxType; marginPct: number; marginMinPct?: number; marginMaxPct?: number; feeFixed?: number }) {
    return this.prisma.pricingConfig.create({ data: input });
  }

  update(id: string, input: Partial<{ marginPct: number; marginMinPct: number; marginMaxPct: number; feeFixed: number; active: boolean }>) {
    return this.prisma.pricingConfig.update({ where: { id }, data: input });
  }

  delete(id: string) {
    return this.prisma.pricingConfig.delete({ where: { id } });
  }

  /**
   * Taux & Marges "Évolution du taux fournisseur vs taux client" — real
   * history, sourced from persisted `Quote` rows (which are already
   * immutable-once-generated, TDS §1), bucketed to one point per day.
   */
  async rateHistory(crypto: string, network: string, fiatCurrency: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const quotes = await this.prisma.quote.findMany({
      where: { crypto, network, fiatCurrency, generatedAt: { gte: since } },
      orderBy: { generatedAt: 'asc' },
      select: { generatedAt: true, providerRate: true, jalRateClient: true },
    });

    const byDay = new Map<string, { providerRateSum: number; clientRateSum: number; count: number }>();
    for (const q of quotes) {
      const key = q.generatedAt.toISOString().slice(0, 10);
      const existing = byDay.get(key) ?? { providerRateSum: 0, clientRateSum: 0, count: 0 };
      existing.providerRateSum += Number(q.providerRate);
      existing.clientRateSum += Number(q.jalRateClient);
      existing.count += 1;
      byDay.set(key, existing);
    }
    return [...byDay.entries()].map(([date, v]) => ({
      date,
      providerRate: Number((v.providerRateSum / v.count).toFixed(4)),
      clientRate: Number((v.clientRateSum / v.count).toFixed(4)),
    }));
  }
}

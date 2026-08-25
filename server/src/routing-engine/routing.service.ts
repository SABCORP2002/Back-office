import { Injectable, NotFoundException } from '@nestjs/common';
import { ProviderConfig } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export interface RoutingContext {
  country: string;
  crypto: string;
  network: string;
}

/**
 * Arch §13 / TDS §3 — provider selection. The client never sees any of
 * this (UX §12): it always resolves to "Acheter/Vendre avec JAL Trade".
 */
@Injectable()
export class RoutingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto mode: an active RoutingRule forcing a provider wins outright
   * (ADM-ROUTE-003 manual override); otherwise pick the eligible,
   * non-DOWN provider with the lowest `priority`, breaking ties by
   * preferring UP health over DEGRADED.
   */
  async selectProvider(ctx: RoutingContext, excludeProviderIds: string[] = []): Promise<ProviderConfig> {
    const forced = await this.prisma.routingRule.findFirst({
      where: {
        active: true,
        forcedProviderId: { not: null },
        OR: [{ country: ctx.country }, { country: null }],
        AND: [{ OR: [{ crypto: ctx.crypto }, { crypto: null }] }, { OR: [{ network: ctx.network }, { network: null }] }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (forced?.forcedProviderId && !excludeProviderIds.includes(forced.forcedProviderId)) {
      const provider = await this.prisma.providerConfig.findUnique({ where: { id: forced.forcedProviderId } });
      if (provider?.active) return provider;
    }

    const candidates = await this.prisma.providerConfig.findMany({
      where: {
        active: true,
        id: { notIn: excludeProviderIds },
        supportedCountries: { has: ctx.country },
        supportedCryptos: { has: ctx.crypto },
        supportedNetworks: { has: ctx.network },
      },
      include: { health: true },
      orderBy: { priority: 'asc' },
    });

    const eligible = candidates.filter((c) => c.health?.status !== 'DOWN');
    const best = eligible.sort((a, b) => {
      const healthScore = (h?: string) => (h === 'UP' ? 0 : h === 'DEGRADED' ? 1 : 2);
      const diff = healthScore(a.health?.status) - healthScore(b.health?.status);
      return diff !== 0 ? diff : a.priority - b.priority;
    })[0];

    if (!best) {
      throw new NotFoundException(
        `No eligible provider for ${ctx.crypto}/${ctx.network} in ${ctx.country} — BUY-002.4 / SELL-005 path: escalate to INTERVENTION_REQUISE.`,
      );
    }
    return best;
  }

  /** ADM-ROUTE-003 — an admin forcing a specific provider for one transaction. Audited by the caller (admin-security). */
  async forceProvider(providerId: string): Promise<ProviderConfig> {
    const provider = await this.prisma.providerConfig.findUnique({ where: { id: providerId } });
    if (!provider || !provider.active) throw new NotFoundException(`Provider ${providerId} not found or inactive`);
    return provider;
  }

  /**
   * Failover target after a confirmed provider failure (Arch §3) — same
   * eligibility rules, excluding the provider(s) that just failed.
   */
  async nextProviderForFailover(ctx: RoutingContext, failedProviderIds: string[]): Promise<ProviderConfig> {
    return this.selectProvider(ctx, failedProviderIds);
  }
}

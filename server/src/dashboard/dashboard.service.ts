import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma.service';

const FAILURE_STATUSES = ['echec', 'expiree', 'annulee'] as const;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

/**
 * Dashboard (back-office home) — pure aggregation over existing tables, no
 * new schema. "Résultat net estimé" deliberately equals gross margin: there
 * is no separate per-transaction operating-cost/fee ledger yet (only
 * `jalMargin` is stored), so a distinct "net" figure would have to be
 * invented rather than computed — documented here instead of faked.
 * Similarly, no "taux marché" alert exists: that would need a live external
 * price oracle this project doesn't have.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const today = startOfDay(new Date());
    const yesterday = daysAgo(1);

    const [todayTx, yesterdayTx, activeUsers, kycPending, blockedTx] = await Promise.all([
      this.prisma.transaction.findMany({ where: { createdAt: { gte: today } }, select: { type: true, status: true, fiatAmountExpected: true, jalMargin: true } }),
      this.prisma.transaction.findMany({ where: { createdAt: { gte: yesterday, lt: today } }, select: { fiatAmountExpected: true, jalMargin: true } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.kycSubmission.count({ where: { status: 'PENDING' } }),
      this.prisma.transaction.count({ where: { status: 'interventionRequise' } }),
    ]);

    const sum = (rows: { fiatAmountExpected: Decimal }[]) => rows.reduce((acc, r) => acc.plus(r.fiatAmountExpected), new Decimal(0));
    const sumMargin = (rows: { jalMargin: Decimal }[]) => rows.reduce((acc, r) => acc.plus(r.jalMargin), new Decimal(0));

    const volumeToday = sum(todayTx);
    const volumeYesterday = sum(yesterdayTx);
    const marginToday = sumMargin(todayTx);
    const marginYesterday = sumMargin(yesterdayTx);

    const achatCount = todayTx.filter((t) => t.type === 'achat').length;
    const venteCount = todayTx.filter((t) => t.type === 'vente').length;
    const failedToday = todayTx.filter((t) => FAILURE_STATUSES.includes(t.status as (typeof FAILURE_STATUSES)[number])).length;
    const errorRate = todayTx.length ? (failedToday / todayTx.length) * 100 : 0;

    return {
      volumeToday: volumeToday.toString(),
      volumeChangePct: pctChange(volumeToday, volumeYesterday),
      transactionsToday: todayTx.length,
      achatCount,
      venteCount,
      transactionsChangePct: pctChange(new Decimal(todayTx.length), new Decimal(yesterdayTx.length)),
      grossMarginToday: marginToday.toString(),
      grossMarginChangePct: pctChange(marginToday, marginYesterday),
      // Documented above: no separate cost ledger exists, so net === gross for now.
      netResultEstimateToday: marginToday.toString(),
      netResultChangePct: pctChange(marginToday, marginYesterday),
      activeUsers,
      kycPending,
      blockedTransactions: blockedTx,
      errorRatePct: Number(errorRate.toFixed(2)),
    };
  }

  async charts(range: '7d' | '30d' | '90d') {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const since = daysAgo(days - 1);

    const rows = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, fiatAmountExpected: true, type: true, crypto: true, providerId: true, provider: { select: { name: true } }, user: { select: { country: true } } },
    });

    const volumeByDay = new Map<string, Decimal>();
    for (let i = 0; i < days; i++) {
      const key = daysAgo(days - 1 - i).toISOString().slice(0, 10);
      volumeByDay.set(key, new Decimal(0));
    }
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      if (volumeByDay.has(key)) volumeByDay.set(key, volumeByDay.get(key)!.plus(r.fiatAmountExpected));
    }

    const achat = rows.filter((r) => r.type === 'achat').length;
    const vente = rows.filter((r) => r.type === 'vente').length;

    return {
      volumeSeries: [...volumeByDay.entries()].map(([date, volume]) => ({ date, volume: volume.toString() })),
      achatVsVente: { achat, vente, total: rows.length },
      byCountry: groupCount(rows.map((r) => r.user.country)),
      byProvider: groupCount(rows.map((r) => r.provider?.name ?? 'Non assigné')),
      byCrypto: groupVolume(rows.map((r) => ({ key: r.crypto, amount: r.fiatAmountExpected }))),
    };
  }

  /** Real signals only — provider health, stuck transactions, recent reconciliation anomalies. No fabricated "market rate drift" alert (no live price oracle exists). */
  async alerts() {
    const [downProviders, blocked, recentAnomalies] = await Promise.all([
      this.prisma.providerHealth.findMany({ where: { status: { in: ['DOWN', 'DEGRADED'] } }, include: { provider: true } }),
      this.prisma.transaction.count({ where: { status: 'interventionRequise' } }),
      this.prisma.reconciliationRecord.findMany({ where: { result: 'ANOMALY' }, orderBy: { runAt: 'desc' }, take: 5, distinct: ['jalTransactionId'] }),
    ]);

    const alerts: Array<{ severity: 'critical' | 'warning' | 'info'; title: string; detail: string }> = [];
    for (const health of downProviders) {
      alerts.push({
        severity: health.status === 'DOWN' ? 'critical' : 'warning',
        title: health.provider.name,
        detail: health.status === 'DOWN' ? 'Indisponible' : 'Performance dégradée',
      });
    }
    if (blocked > 0) {
      alerts.push({ severity: 'warning', title: `${blocked} transaction(s) en intervention`, detail: 'Nécessite une action manuelle' });
    }
    for (const a of recentAnomalies) {
      alerts.push({ severity: 'warning', title: `Anomalie de réconciliation`, detail: `${a.jalTransactionId} — ${a.anomalyType ?? 'écart détecté'}` });
    }
    return alerts;
  }
}

function pctChange(current: Decimal, previous: Decimal): number {
  if (previous.isZero()) return current.isZero() ? 0 : 100;
  return Number(current.minus(previous).div(previous).mul(100).toFixed(2));
}

function groupCount(values: string[]): Array<{ key: string; count: number; pct: number }> {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  const total = values.length || 1;
  return [...map.entries()].map(([key, count]) => ({ key, count, pct: Number(((count / total) * 100).toFixed(1)) })).sort((a, b) => b.count - a.count);
}

function groupVolume(rows: Array<{ key: string; amount: Decimal }>): Array<{ key: string; volume: string; pct: number }> {
  const map = new Map<string, Decimal>();
  for (const r of rows) map.set(r.key, (map.get(r.key) ?? new Decimal(0)).plus(r.amount));
  const total = [...map.values()].reduce((acc, v) => acc.plus(v), new Decimal(0));
  return [...map.entries()]
    .map(([key, volume]) => ({ key, volume: volume.toString(), pct: total.isZero() ? 0 : Number(volume.div(total).mul(100).toFixed(1)) }))
    .sort((a, b) => Number(b.volume) - Number(a.volume));
}

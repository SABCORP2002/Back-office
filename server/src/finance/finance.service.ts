import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma.service';
import { toCsv } from '../common/csv.util';
import { AuditService } from '../audit-logs/audit.service';

/**
 * Finance & Rapports. Deliberately conservative about what it reports as
 * fact: `jalMargin` is the only real revenue figure this system tracks (no
 * per-transaction operating-cost/fee ledger exists). So "commissions" and
 * "bénéfice net" both equal the same margin total rather than being split
 * into invented categories, and the revenue-breakdown chart returns one
 * real category instead of a fabricated multi-slice donut. "Solde
 * disponible" is genuinely computed: revenue earned minus withdrawals
 * already paid out.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async summary(dateFrom?: Date, dateTo?: Date) {
    const [txAgg, paidWithdrawals] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { createdAt: dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined },
        _sum: { jalMargin: true },
      }),
      this.prisma.platformWithdrawal.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    ]);

    const revenueTotal = txAgg._sum.jalMargin ?? new Decimal(0);
    const withdrawn = paidWithdrawals._sum.amount ?? new Decimal(0);

    return {
      revenueTotal: revenueTotal.toString(),
      commissions: revenueTotal.toString(), // same figure — no separate commission ledger exists
      feesAndCharges: '0', // no operating-cost tracking exists — 0, not invented
      netProfit: revenueTotal.toString(),
      availableBalance: revenueTotal.minus(withdrawn).toString(),
      totalWithdrawn: withdrawn.toString(),
    };
  }

  /** "Résumé financier par période" table — one row per day. */
  async periodBreakdown(dateFrom: Date, dateTo: Date) {
    const rows = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      select: { createdAt: true, jalMargin: true, fiatAmountExpected: true },
    });

    const byDay = new Map<string, { revenue: Decimal; volume: Decimal }>();
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(key) ?? { revenue: new Decimal(0), volume: new Decimal(0) };
      existing.revenue = existing.revenue.plus(r.jalMargin);
      existing.volume = existing.volume.plus(r.fiatAmountExpected);
      byDay.set(key, existing);
    }

    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, { revenue, volume }]) => ({
        date,
        revenueTotal: revenue.toString(),
        commissions: revenue.toString(),
        feesAndCharges: '0',
        netProfit: revenue.toString(),
        marginPct: volume.isZero() ? '0' : revenue.div(volume).mul(100).toFixed(2),
      }));
  }

  async exportTransactionsCsv(dateFrom?: Date, dateTo?: Date): Promise<string> {
    const rows = await this.prisma.transaction.findMany({
      where: { createdAt: dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined },
      include: { user: { select: { country: true } }, provider: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return toCsv(
      rows.map((t) => ({
        jalTransactionId: t.jalTransactionId,
        type: t.type,
        status: t.status,
        country: t.user.country,
        crypto: t.crypto,
        network: t.network,
        cryptoAmount: t.cryptoAmountExpected.toString(),
        fiatAmount: t.fiatAmountExpected.toString(),
        fiatCurrency: t.fiatCurrency,
        provider: t.provider?.name ?? '',
        jalRate: t.jalRateLocked.toString(),
        jalMargin: t.jalMargin.toString(),
        createdAt: t.createdAt.toISOString(),
      })),
    );
  }

  // --- Withdrawals ("Solde & Retraits") ---

  async listWithdrawals() {
    return this.prisma.platformWithdrawal.findMany({ include: { admin: { select: { email: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async requestWithdrawal(adminId: string, amount: number, currency: string, destination: string, justification: string) {
    const { availableBalance } = await this.summary();
    if (amount > Number(availableBalance)) {
      throw new BadRequestException(`Requested amount ${amount} exceeds available balance ${availableBalance}`);
    }
    const withdrawal = await this.prisma.platformWithdrawal.create({
      data: { amount, currency, destination, requestedBy: adminId },
    });
    await this.audit.record({ adminId, actionType: 'REQUEST_WITHDRAWAL', newValue: { amount, currency, destination }, justification });
    return withdrawal;
  }

  async markWithdrawalPaid(id: string, adminId: string) {
    const withdrawal = await this.prisma.platformWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new NotFoundException(`Withdrawal ${id} not found`);
    const updated = await this.prisma.platformWithdrawal.update({ where: { id }, data: { status: 'PAID', completedAt: new Date() } });
    await this.audit.record({ adminId, actionType: 'WITHDRAWAL_PAID', jalTransactionId: undefined, oldValue: { status: withdrawal.status }, newValue: { status: 'PAID' }, justification: 'Retrait confirmé payé' });
    return updated;
  }
}

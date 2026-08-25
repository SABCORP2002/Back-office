import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TxStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { toCsv } from '../common/csv.util';
import { toClientTransactionView } from './transaction-view';

/** UX §3.8 (TXN-001…004) + §4.2 (ADM-TXN-001…003). */
@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const rows = await this.prisma.transaction.findMany({
      where: { userId },
      include: { blockchainTransactions: { orderBy: { detectedAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toClientTransactionView);
  }

  async getForUser(userId: string, jalTransactionId: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { jalTransactionId, userId },
      include: { blockchainTransactions: { orderBy: { detectedAt: 'desc' }, take: 1 }, events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!tx) throw new NotFoundException(`Transaction ${jalTransactionId} not found`);
    return { ...toClientTransactionView(tx), timeline: tx.events.map((e) => ({ status: e.newStatus, at: e.createdAt })) };
  }

  // --- Admin (ADM-TXN-001…003) — full field set, per UX §15 ---

  /** ADM-TXN-001: "Filtrer par statut/pays/fournisseur/date". */
  async adminList(filters: { status?: TxStatus; providerId?: string; userId?: string; country?: string; dateFrom?: string; dateTo?: string }) {
    return this.prisma.transaction.findMany({
      where: {
        status: filters.status,
        providerId: filters.providerId,
        userId: filters.userId,
        user: filters.country ? { country: filters.country } : undefined,
        createdAt: filters.dateFrom || filters.dateTo ? { gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined, lte: filters.dateTo ? new Date(filters.dateTo) : undefined } : undefined,
      },
      include: { provider: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminDetail(jalTransactionId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { jalTransactionId },
      include: {
        provider: true,
        user: true,
        quote: true,
        paymentAttempts: true,
        providerOrders: true,
        blockchainTransactions: true,
        refund: true,
        reconciliationRecords: { orderBy: { runAt: 'desc' }, take: 5 },
      },
    });
    if (!tx) throw new NotFoundException(`Transaction ${jalTransactionId} not found`);
    return tx;
  }

  /** Transactions page "Exporter" button. */
  async exportCsv(filters: { status?: TxStatus; providerId?: string; country?: string; dateFrom?: string; dateTo?: string }) {
    const rows = await this.adminList(filters);
    return toCsv(
      rows.map((t) => ({
        jalTransactionId: t.jalTransactionId,
        user: t.user.phone ?? t.user.email ?? t.userId,
        country: t.user.country,
        type: t.type,
        crypto: t.crypto,
        network: t.network,
        cryptoAmount: t.cryptoAmountExpected.toString(),
        fiatAmount: t.fiatAmountExpected.toString(),
        fiatCurrency: t.fiatCurrency,
        provider: t.provider?.name ?? '',
        jalRate: t.jalRateLocked.toString(),
        jalMargin: t.jalMargin.toString(),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
    );
  }

  async adminTimeline(jalTransactionId: string) {
    await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
    return this.prisma.transactionEvent.findMany({ where: { jalTransactionId }, orderBy: { createdAt: 'asc' } });
  }

  /** ADM-TXN-004 "Intervention manuelle" reads the current status for admin-side validation before a resume attempt. */
  async assertResumable(jalTransactionId: string) {
    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
    if (tx.status !== 'interventionRequise') {
      throw new ForbiddenException(`Transaction ${jalTransactionId} is ${tx.status}, not interventionRequise — nothing to resolve`);
    }
    return tx;
  }
}

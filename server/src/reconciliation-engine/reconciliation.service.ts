import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma.service';
import { StateMachineService } from '../state-machine/state-machine.service';
import { BuyService } from '../transaction-engine/buy.service';
import { SellService } from '../transaction-engine/sell.service';

/**
 * UX §4.7 (ADM-FIN-001) / TDS §9 — "JAL ne dépend jamais uniquement des
 * webhooks — un webhook peut ne jamais arriver." This is the module
 * explicitly called out as V1-required, not deferrable to V2.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly stateMachine: StateMachineService,
    private readonly buyService: BuyService,
    private readonly sellService: SellService,
  ) {}

  /** Active transactions: short cycle. Proposition V1 — every 30s locally. */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async runActiveCycle() {
    const active = await this.prisma.transaction.findMany({
      where: { terminalAt: null },
      select: { jalTransactionId: true },
      take: 200,
    });
    for (const { jalTransactionId } of active) {
      await this.runForTransaction(jalTransactionId).catch((err) =>
        this.logger.error(`Reconciliation failed for ${jalTransactionId}: ${err instanceof Error ? err.message : err}`),
      );
    }
  }

  /** Balayage de sécurité — terminal transactions from the last 24h, daily. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runTerminalSweep() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.transaction.findMany({
      where: { terminalAt: { gte: since } },
      select: { jalTransactionId: true },
    });
    for (const { jalTransactionId } of recent) {
      await this.runForTransaction(jalTransactionId).catch((err) =>
        this.logger.error(`Terminal sweep failed for ${jalTransactionId}: ${err instanceof Error ? err.message : err}`),
      );
    }
  }

  async runForTransaction(jalTransactionId: string) {
    const tx = await this.prisma.transaction.findUniqueOrThrow({
      where: { jalTransactionId },
      include: {
        paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 },
        providerOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
        blockchainTransactions: { orderBy: { detectedAt: 'desc' }, take: 1 },
      },
    });

    const momo = tx.paymentAttempts[0];
    const provider = tx.providerOrders[0];
    const chain = tx.blockchainTransactions[0];

    const { result, anomalyType } = this.classify(tx, momo, provider, chain);

    await this.prisma.reconciliationRecord.create({
      data: {
        jalTransactionId,
        jalStatus: tx.status,
        mobileMoneyStatus: momo?.status,
        providerStatus: provider?.status,
        blockchainStatus: chain?.status,
        expectedAmounts: { fiat: tx.fiatAmountExpected.toString(), crypto: tx.cryptoAmountExpected.toString() } as Prisma.InputJsonValue,
        actualAmounts: { fiat: momo?.amount?.toString(), crypto: chain?.amountDetected?.toString() } as Prisma.InputJsonValue,
        result,
        anomalyType,
      },
    });

    if (result === 'ANOMALY' && tx.status !== 'interventionRequise' && !tx.terminalAt) {
      await this.stateMachine.transition({
        jalTransactionId,
        type: tx.type,
        from: tx.status,
        to: 'interventionRequise',
        triggeredBy: 'job',
        eventType: `RECONCILIATION_ANOMALY_${anomalyType}`,
      });
      this.logger.warn(`Anomaly on ${jalTransactionId}: ${anomalyType} — escalated to interventionRequise`);
      return { result, anomalyType };
    }

    if (result === 'RECONCILED') {
      if (tx.status === 'cryptoEnvoyee') await this.buyService.advanceToTerminee(jalTransactionId);
      if (tx.status === 'paiementEffectue') await this.sellService.advanceToTerminee(jalTransactionId);
    }

    return { result, anomalyType };
  }

  private classify(
    tx: { type: string; status: string; cryptoAmountExpected: Decimal; updatedAt: Date },
    momo?: { status: string },
    provider?: { status: string },
    chain?: { status: string; amountDetected: Decimal | null },
  ): { result: 'RECONCILED' | 'ANOMALY'; anomalyType?: string } {
    // Amount mismatch is never tolerated silently (TDS §9).
    if (chain?.amountDetected != null && !new Decimal(chain.amountDetected).equals(tx.cryptoAmountExpected)) {
      return { result: 'ANOMALY', anomalyType: 'AMOUNT_MISMATCH' };
    }

    // A source reporting a hard failure while JAL hasn't reacted yet.
    const hardFailure = provider?.status === 'JAL_FAILED' || chain?.status === 'FAILED' || momo?.status === 'FAILED';
    const failureFamily = ['echec', 'expiree', 'annulee', 'interventionRequise', 'remboursementEnCours', 'rembourse'];
    if (hardFailure && !failureFamily.includes(tx.status)) {
      return { result: 'ANOMALY', anomalyType: 'STATUS_MISMATCH' };
    }

    // Stale non-terminal transaction — TDS §19 "délai avant intervention = 2x délai normal".
    const multiplier = Number(this.config.get('INTERVENTION_MULTIPLIER') ?? 2);
    const baseMinutes = Number(this.config.get('MOMO_PAYMENT_MAX_MINUTES') ?? 10);
    const staleAfterMs = baseMinutes * multiplier * 60_000;
    const nonTerminal = !['terminee', 'echec', 'expiree', 'annulee', 'rembourse'].includes(tx.status);
    if (nonTerminal && tx.status !== 'interventionRequise' && Date.now() - tx.updatedAt.getTime() > staleAfterMs) {
      return { result: 'ANOMALY', anomalyType: 'STALE_NON_TERMINAL' };
    }

    return { result: 'RECONCILED' };
  }
}

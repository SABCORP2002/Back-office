import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, TxStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { StateMachineService } from '../state-machine/state-machine.service';
import { AuditService } from '../audit-logs/audit.service';
import { RoutingService } from '../routing-engine/routing.service';
import { TransactionEngineService } from '../transaction-engine/transaction-engine.service';
import { assertDistinctCoValidator } from '../admin-security/dual-validation.util';
import { TransactionsService } from './transactions.service';

/**
 * ADM-TXN-004…006 — Arch §5.1: "Un override manuel depuis le back-office
 * reste possible pour débloquer une transaction en intervention, mais passe
 * obligatoirement par une justification et un enregistrement en audit log
 * — jamais un changement de statut silencieux."
 */
@Injectable()
export class TransactionAdminActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly stateMachine: StateMachineService,
    private readonly audit: AuditService,
    private readonly routing: RoutingService,
    private readonly engine: TransactionEngineService,
    private readonly transactions: TransactionsService,
  ) {}

  /** ADM-TXN-004 "Forcer un statut" — resume from interventionRequise back into the flow. */
  async intervene(jalTransactionId: string, adminId: string, input: { targetStatus: TxStatus; justification: string; ipAddress?: string }) {
    const tx = await this.transactions.assertResumable(jalTransactionId);

    const result = await this.stateMachine.transition({
      jalTransactionId,
      type: tx.type,
      from: 'interventionRequise',
      to: input.targetStatus,
      triggeredBy: 'admin',
      eventType: 'ADMIN_INTERVENTION',
      sourceReference: adminId,
    });
    if (!result.applied) throw new ConflictException('Transaction status changed concurrently — reload and retry');

    await this.audit.record({
      adminId,
      actionType: 'CHANGE_TRANSACTION_STATUS',
      jalTransactionId,
      oldValue: { status: 'interventionRequise' },
      newValue: { status: input.targetStatus },
      justification: input.justification,
      ipAddress: input.ipAddress,
    });
    return result;
  }

  /** ADM-TXN-004 "Forcer/override un fournisseur" — reroutes a stuck transaction to a specific provider. */
  async forceProvider(jalTransactionId: string, adminId: string, input: { providerId: string; justification: string }) {
    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
    const provider = await this.routing.forceProvider(input.providerId);

    await this.prisma.transaction.update({ where: { jalTransactionId }, data: { providerId: provider.id } });
    await this.audit.record({
      adminId,
      actionType: 'FORCE_PROVIDER',
      jalTransactionId,
      oldValue: { providerId: tx.providerId },
      newValue: { providerId: provider.id },
      justification: input.justification,
    });
    return provider;
  }

  /**
   * ADM-TXN-005 "Relancer" — re-checks provider status for a stuck UNKNOWN
   * order (see TransactionEngineService.verifyProviderOrder). Only needs
   * the JAL Transaction ID — resolves the latest provider_order's
   * idempotency key itself, since that's not something an admin looking at
   * ADM-TXN-004/005 would have on hand.
   */
  async retryVerification(jalTransactionId: string) {
    const order = await this.prisma.providerOrder.findFirst({
      where: { jalTransactionId },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) throw new BadRequestException(`No provider order exists yet for ${jalTransactionId} — nothing to verify`);
    return this.engine.verifyProviderOrder(jalTransactionId, order.idempotencyKey);
  }

  /**
   * ADM-TXN-006 — TDS §13 Refund Rules. `UNIQUE(jalTransactionId)` on the
   * Refund table is the real anti-double-refund guarantee; this method adds
   * the process around it (dual validation above threshold, audit trail,
   * correct destination).
   *
   * No real payout rail exists for refunds yet (CONFIGURABLE), so this
   * scaffold advances REQUESTED -> APPROVED -> PROCESSING -> COMPLETED
   * synchronously rather than through TDS §7's async job+DLQ — documented
   * simplification, not a spec deviation in the *rules*, only in *execution*.
   */
  async triggerRefund(jalTransactionId: string, adminId: string, input: { reason: string; destination: string; coValidatedBy?: string; ipAddress?: string }) {
    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
    if (!['interventionRequise', 'echec'].includes(tx.status)) {
      throw new BadRequestException(`Refund is only valid from interventionRequise/echec, transaction is ${tx.status} (TDS §13)`);
    }

    const threshold = Number(this.config.get('REFUND_DUAL_VALIDATION_THRESHOLD') ?? 100_000);
    if (Number(tx.fiatAmountExpected) > threshold) {
      assertDistinctCoValidator(adminId, input.coValidatedBy);
    }

    let refund;
    try {
      refund = await this.prisma.refund.create({
        data: {
          jalTransactionId,
          amount: tx.fiatAmountExpected,
          destination: input.destination,
          reason: input.reason,
          authorizedBy: adminId,
          coValidatedBy: input.coValidatedBy,
          status: 'APPROVED',
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Transaction ${jalTransactionId} already has a refund — TDS §13 allows exactly one`);
      }
      throw err;
    }

    await this.stateMachine.transition({
      jalTransactionId,
      type: tx.type,
      from: tx.status,
      to: 'remboursementEnCours',
      triggeredBy: 'admin',
      eventType: 'REFUND_TRIGGERED',
      sourceReference: adminId,
    });

    await this.prisma.refund.update({ where: { jalTransactionId }, data: { status: 'PROCESSING' } });
    await this.stateMachine.transition({
      jalTransactionId,
      type: tx.type,
      from: 'remboursementEnCours',
      to: 'rembourse',
      triggeredBy: 'system',
      eventType: 'REFUND_COMPLETED',
    });
    await this.prisma.refund.update({ where: { jalTransactionId }, data: { status: 'COMPLETED', completedAt: new Date() } });

    await this.audit.record({
      adminId,
      actionType: 'TRIGGER_REFUND',
      jalTransactionId,
      newValue: { amount: refund.amount, destination: input.destination },
      justification: input.reason,
      ipAddress: input.ipAddress,
      requiresDualValidation: Number(tx.fiatAmountExpected) > threshold,
      coValidatedBy: input.coValidatedBy,
    });

    return this.prisma.refund.findUniqueOrThrow({ where: { jalTransactionId } });
  }
}

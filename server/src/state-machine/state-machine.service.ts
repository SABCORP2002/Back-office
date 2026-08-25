import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, TxStatus, TxType } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { isAllowedTransition } from './transitions';

export type TriggeredBy = 'system' | 'webhook' | 'admin' | 'job';

export interface TransitionRequest {
  jalTransactionId: string;
  type: TxType;
  from: TxStatus;
  to: TxStatus;
  triggeredBy: TriggeredBy;
  eventType: string;
  sourceReference?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionOutcome {
  applied: boolean;
  reason?: 'invalid-edge' | 'stale-status';
}

/**
 * TDS §5.1 mechanism #2. A transaction never moves between statuses except
 * through here, and never through a plain `UPDATE ... SET status = ?` —
 * always `UPDATE ... WHERE status = expectedFrom`, so a lost race is a
 * silent no-op rather than a second execution of whatever business action
 * triggered the call (Arch §5).
 */
@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Rejects nonsensical transitions before ever touching the DB (Arch §5: "chaque transition exige une condition technique vérifiable"). */
  assertAllowed(type: TxType, from: TxStatus, to: TxStatus): void {
    if (!isAllowedTransition(type, from, to)) {
      throw new BadRequestException(
        `Transition ${from} -> ${to} is not valid for type ${type} (TDS §4). No arbitrary status change is permitted, including from the back-office.`,
      );
    }
  }

  /**
   * Compare-and-swap transition + append-only transaction_event write, in
   * one DB transaction. Returns `applied: false` (never throws) when another
   * process already moved the transaction past `from` — callers must treat
   * that as a no-op, never as a signal to retry the business action.
   */
  async transition(req: TransitionRequest): Promise<TransitionOutcome> {
    this.assertAllowed(req.type, req.from, req.to);

    return this.prisma.$transaction(async (tx) => {
      const cas = await tx.transaction.updateMany({
        where: { jalTransactionId: req.jalTransactionId, status: req.from },
        data: {
          status: req.to,
          terminalAt: this.isTerminalTarget(req.to) ? new Date() : undefined,
        },
      });

      if (cas.count === 0) {
        this.logger.warn(
          `CAS miss: ${req.jalTransactionId} expected status ${req.from} to reach ${req.to} — no-op (another process already moved it).`,
        );
        return { applied: false, reason: 'stale-status' };
      }

      await tx.transactionEvent.create({
        data: {
          jalTransactionId: req.jalTransactionId,
          eventType: req.eventType,
          previousStatus: req.from,
          newStatus: req.to,
          triggeredBy: req.triggeredBy,
          sourceReference: req.sourceReference,
          metadata: (req.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });

      return { applied: true };
    });
  }

  private isTerminalTarget(status: TxStatus): boolean {
    return (['terminee', 'echec', 'expiree', 'annulee', 'rembourse'] as TxStatus[]).includes(status);
  }
}

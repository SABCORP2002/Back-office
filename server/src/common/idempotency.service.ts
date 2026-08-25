import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

/**
 * The primary anti-double-execution mechanism (TDS §5.1 mechanism #1, §6).
 *
 * Every critical financial instruction — Mobile Money payment/payout,
 * provider order creation, refund — must go through `run()` before touching
 * any external adapter. The INSERT into `idempotency_keys` is atomic: if two
 * processes race on the same key, exactly one INSERT succeeds; the loser
 * reads the winner's result instead of acting.
 *
 * Key format is always `{jalTransactionId}:{operation}:{attempt}` (see
 * `buildKey`). `attempt` only increments on a *confirmed* failure (a
 * controlled failover — Arch §2–3), never on a plain technical retry. A
 * technical retry reuses the exact same key on purpose, so it safely
 * collides with the original attempt instead of executing twice.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  buildKey(jalTransactionId: string, operation: string, attempt: number): string {
    return `${jalTransactionId}:${operation}:${attempt}`;
  }

  /**
   * Runs `fn` at most once for a given `key`. If the key was already
   * completed (success or failure), returns the cached outcome without
   * calling `fn` again. If the key is still in flight (a concurrent call, or
   * a process that died mid-operation), throws a 409 — callers must verify
   * real status (getTransactionStatus / webhook) rather than blindly retry,
   * per TDS §3's three-branch failover rule.
   */
  async run<T>(
    key: string,
    operationType: string,
    jalTransactionId: string | null,
    fn: () => Promise<T>,
  ): Promise<{ result: T; replayed: boolean }> {
    try {
      await this.prisma.idempotencyKey.create({
        data: { key, operationType, jalTransactionId, status: 'IN_PROGRESS' },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.idempotencyKey.findUniqueOrThrow({ where: { key } });
        if (existing.status === 'COMPLETED') {
          const snapshot = existing.resultSnapshot as { error?: boolean; message?: string } | null;
          if (snapshot?.error) {
            throw new Error(`[idempotent-replay] ${snapshot.message ?? 'operation previously failed'}`);
          }
          return { result: existing.resultSnapshot as T, replayed: true };
        }
        throw new ConflictException(
          `Operation ${key} is already in progress — verify real status before retrying (TDS §3).`,
        );
      }
      throw err;
    }

    try {
      const result = await fn();
      await this.prisma.idempotencyKey.update({
        where: { key },
        data: { status: 'COMPLETED', resultSnapshot: result as Prisma.InputJsonValue },
      });
      return { result, replayed: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      await this.prisma.idempotencyKey.update({
        where: { key },
        data: { status: 'COMPLETED', resultSnapshot: { error: true, message } },
      });
      throw err;
    }
  }
}

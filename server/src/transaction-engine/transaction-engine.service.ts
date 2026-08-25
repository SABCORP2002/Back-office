import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaymentAttemptStatus, PaymentDirection, TxStatus, TxType } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { IdempotencyService } from '../common/idempotency.service';
import { StateMachineService } from '../state-machine/state-machine.service';
import { RoutingService, RoutingContext } from '../routing-engine/routing.service';
import { ProviderAdapterRegistry } from '../provider-adapters/provider-adapter.registry';
import { MomoAdapterRegistry } from '../mobile-money-adapters/momo-adapter.registry';
import { classifyProviderOutcome } from '../routing-engine/failover';
import { MomoStatus } from '../mobile-money-adapters/momo-adapter.interface';
import { NotificationService } from '../notification-system/notification.service';

/**
 * Shared orchestration primitives used by both BuyService and SellService —
 * the parts of Arch §1–3 and TDS §5–7 that don't differ between the two
 * flows: provider rate resolution, the idempotency-wrapped provider-order
 * creation with failover, and Mobile Money instruction dispatch.
 */
@Injectable()
export class TransactionEngineService {
  private readonly logger = new Logger(TransactionEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly stateMachine: StateMachineService,
    private readonly routing: RoutingService,
    private readonly providerAdapters: ProviderAdapterRegistry,
    private readonly momoAdapters: MomoAdapterRegistry,
    private readonly notifications: NotificationService,
  ) {}

  async resolveProviderRate(ctx: RoutingContext, fiatCurrency: string, amount: number) {
    const provider = await this.routing.selectProvider(ctx);
    const adapter = this.providerAdapters.get(provider.name);
    const quote = await adapter.quote({ crypto: ctx.crypto, network: ctx.network, fiatCurrency, amount });
    return { provider, providerRate: quote.providerRate };
  }

  /**
   * TDS §4.1 rows 4–5: initiates the provider order under an attempt-numbered
   * idempotency key, applies Arch §3's three-branch outcome handling, and
   * fails over to the next eligible provider on a *confirmed* failure only
   * — never on timeout/unknown. Assumes the transaction is already (or is
   * about to be, via the caller) in `cryptoEnCoursEnvoi`.
   */
  async createProviderOrderWithFailover(params: {
    jalTransactionId: string;
    type: TxType;
    ctx: RoutingContext;
    direction: 'BUY_SEND' | 'SELL_RECEIVE';
    amount: number;
    destination: string;
    attempt?: number;
    excludeProviderIds?: string[];
  }): Promise<{ outcome: 'confirmed-success' | 'confirmed-failure-escalated' | 'unknown-pending-verification' }> {
    const attempt = params.attempt ?? 1;
    const excluded = params.excludeProviderIds ?? [];

    let provider;
    try {
      provider = await this.routing.selectProvider(params.ctx, excluded);
    } catch {
      // No eligible provider left — BUY §2.4 / SELL §3.5: escalate, never fail silently.
      await this.stateMachine.transition({
        jalTransactionId: params.jalTransactionId,
        type: params.type,
        from: 'cryptoEnCoursEnvoi',
        to: 'interventionRequise',
        triggeredBy: 'system',
        eventType: 'NO_PROVIDER_AVAILABLE',
      });
      return { outcome: 'confirmed-failure-escalated' };
    }

    const key = this.idempotency.buildKey(params.jalTransactionId, 'send', attempt);
    const adapter = this.providerAdapters.get(provider.name);

    try {
      const { result } = await this.idempotency.run(key, 'create_order', params.jalTransactionId, () =>
        adapter.createOrder({
          idempotencyKey: key,
          direction: params.direction,
          crypto: params.ctx.crypto,
          network: params.ctx.network,
          amount: params.amount,
          destination: params.destination,
        }),
      );

      await this.prisma.providerOrder.upsert({
        where: { idempotencyKey: key },
        create: {
          jalTransactionId: params.jalTransactionId,
          providerId: provider.id,
          idempotencyKey: key,
          direction: params.direction,
          requestedAmount: params.amount,
          providerOrderId: result.providerOrderId,
          status: result.status,
        },
        update: { status: result.status, providerOrderId: result.providerOrderId },
      });

      const branch = classifyProviderOutcome({ threw: false, status: result.status });

      if (branch === 'confirmed-success') {
        if (result.txHash) {
          await this.prisma.blockchainTransaction.create({
            data: {
              jalTransactionId: params.jalTransactionId,
              network: params.ctx.network,
              direction: 'OUTGOING',
              amountExpected: params.amount,
              txHash: result.txHash,
              status: 'DETECTED',
              detectedAt: new Date(),
            },
          });
        }
        return { outcome: 'confirmed-success' };
      }

      if (branch === 'confirmed-failure') {
        this.logger.warn(`Provider ${provider.name} confirmed-failed order for ${params.jalTransactionId} — failing over.`);
        return this.createProviderOrderWithFailover({
          ...params,
          attempt: attempt + 1,
          excludeProviderIds: [...excluded, provider.id],
        });
      }

      // pending or unknown at this point — stay in cryptoEnCoursEnvoi, await webhook/verification.
      return { outcome: 'unknown-pending-verification' };
    } catch {
      // The adapter call itself threw (simulated network timeout). Arch §3:
      // never assume failure, never retry blindly — leave it for verification.
      this.logger.warn(`Provider ${provider.name} order for ${params.jalTransactionId} timed out — awaiting verification (Arch §3).`);
      return { outcome: 'unknown-pending-verification' };
    }
  }

  /**
   * TDS §11 "getTransactionStatus() | provider_order_id ou idempotency_key"
   * — resolves an UNKNOWN provider order after a timeout, mirroring Arch
   * §2.2's polling job. Callable directly (dev/tests) or from a scheduled
   * job wired later; not on an automatic timer in this pass (see
   * ARCHITECTURE.md "Follow-ups").
   */
  async verifyProviderOrder(jalTransactionId: string, idempotencyKey: string) {
    const order = await this.prisma.providerOrder.findUnique({ where: { idempotencyKey }, include: { provider: true } });
    if (!order) throw new BadRequestException(`No provider order for key ${idempotencyKey}`);
    const transaction = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
    const adapter = this.providerAdapters.get(order.provider.name);
    const status = await adapter.getTransactionStatus({ providerOrderId: order.providerOrderId ?? `fake-${idempotencyKey}` });

    await this.prisma.providerOrder.update({ where: { idempotencyKey }, data: { status: status.status, rawProviderStatus: status.rawStatus } });

    const branch = classifyProviderOutcome({ threw: false, status: status.status });
    if (branch === 'confirmed-success') {
      if (status.txHash) {
        const existing = await this.prisma.blockchainTransaction.findUnique({ where: { txHash: status.txHash } });
        if (!existing) {
          await this.prisma.blockchainTransaction.create({
            data: {
              jalTransactionId,
              network: transaction.network,
              direction: 'OUTGOING',
              amountExpected: order.requestedAmount,
              txHash: status.txHash,
              status: 'DETECTED',
              detectedAt: new Date(),
            },
          });
        }
      }
      // Confirmed after having been UNKNOWN — advance BUY's send step now
      // that we finally know it succeeded (Arch §2.2's example scenario).
      if (transaction.type === 'achat') {
        const applied = await this.stateMachine.transition({
          jalTransactionId,
          type: 'achat',
          from: 'cryptoEnCoursEnvoi',
          to: 'cryptoEnvoyee',
          triggeredBy: 'webhook',
          eventType: 'CRYPTO_SENT_CONFIRMED_LATE',
        });
        if (applied.applied) await this.notifications.notifyTransactionEvent(transaction.userId, jalTransactionId, 'achat', 'cryptoEnvoyee');
      }
    }
    return { branch, status };
  }

  /** Mobile Money instruction dispatch shared by BUY payment-in and SELL payout-out. */
  async initiateMomo(params: {
    jalTransactionId: string;
    direction: PaymentDirection;
    operator: string;
    country: string;
    phoneNumber: string;
    amount: number;
    currency: string;
    attempt?: number;
  }): Promise<{ status: PaymentAttemptStatus; threw: boolean }> {
    const attempt = params.attempt ?? 1;
    const operationType = params.direction === 'IN' ? 'pay' : 'payout';
    const key = this.idempotency.buildKey(params.jalTransactionId, operationType, attempt);
    const adapter = this.momoAdapters.resolve(params.operator, params.country);

    try {
      const { result } = await this.idempotency.run(key, operationType, params.jalTransactionId, () =>
        params.direction === 'IN'
          ? adapter.initiatePayment({ idempotencyKey: key, operator: params.operator, phoneNumber: params.phoneNumber, amount: params.amount, currency: params.currency })
          : adapter.initiatePayout({ idempotencyKey: key, operator: params.operator, phoneNumber: params.phoneNumber, amount: params.amount, currency: params.currency }),
      );

      await this.prisma.paymentAttempt.create({
        data: {
          jalTransactionId: params.jalTransactionId,
          direction: params.direction,
          operator: params.operator,
          phoneNumber: params.phoneNumber,
          amount: params.amount,
          idempotencyKey: key,
          status: toPaymentAttemptStatus(result.status),
          providerReference: result.providerReference,
        },
      });
      return { status: toPaymentAttemptStatus(result.status), threw: false };
    } catch {
      await this.prisma.paymentAttempt.create({
        data: {
          jalTransactionId: params.jalTransactionId,
          direction: params.direction,
          operator: params.operator,
          phoneNumber: params.phoneNumber,
          amount: params.amount,
          idempotencyKey: key,
          status: 'UNKNOWN',
        },
      });
      return { status: 'UNKNOWN', threw: true };
    }
  }

  async transitionOrIgnore(params: { jalTransactionId: string; type: TxType; from: TxStatus; to: TxStatus; triggeredBy: 'system' | 'webhook' | 'admin' | 'job'; eventType: string; sourceReference?: string }) {
    return this.stateMachine.transition(params);
  }
}

function toPaymentAttemptStatus(status: MomoStatus): PaymentAttemptStatus {
  return status;
}

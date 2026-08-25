import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { verifyHmacSignature } from './webhook-signature.util';
import { BuyService } from '../transaction-engine/buy.service';
import { SellService } from '../transaction-engine/sell.service';
import { TransactionEngineService } from '../transaction-engine/transaction-engine.service';
import { StateMachineService } from '../state-machine/state-machine.service';
import { NormalizedStatus } from '../provider-adapters/provider-adapter.interface';

export interface MomoWebhookPayload {
  externalEventId: string;
  jalTransactionId: string;
  direction: 'IN' | 'OUT';
  status: 'CONFIRMED' | 'FAILED';
  amount: number;
  eventTimestamp?: string;
}

export interface ProviderWebhookPayload {
  externalEventId: string;
  jalTransactionId: string;
  providerOrderId: string;
  status: NormalizedStatus;
  txHash?: string;
  eventTimestamp?: string;
}

export interface BlockchainWebhookPayload {
  externalEventId: string;
  jalTransactionId: string;
  eventTimestamp?: string;
}

/**
 * Arch §4 / TDS §8 — authenticated, deduplicated, idempotent intake. Every
 * webhook is validated against the transaction's *current* state via
 * StateMachineService's compare-and-swap (called from Buy/SellService), not
 * treated as "the logical next step" — a webhook arriving late or
 * out-of-order is a no-op if the transaction already moved past it.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly buyService: BuyService,
    private readonly sellService: SellService,
    private readonly engine: TransactionEngineService,
    private readonly stateMachine: StateMachineService,
  ) {}

  private async ingest(source: string, externalEventId: string, rawPayload: unknown, signatureValid: boolean, jalTransactionId?: string) {
    try {
      const event = await this.prisma.webhookEvent.create({
        data: {
          source,
          externalEventId,
          rawPayload: rawPayload as Prisma.InputJsonValue,
          signatureValid,
          jalTransactionId,
          processingStatus: signatureValid ? 'RECEIVED' : 'REJECTED',
        },
      });
      return { event, duplicate: false };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        this.logger.log(`Duplicate webhook ${source}/${externalEventId} — no-op (TDS §8 dedup)`);
        return { event: null, duplicate: true };
      }
      throw err;
    }
  }

  private async markProcessed(id: string, status: 'PROCESSED' | 'IGNORED') {
    await this.prisma.webhookEvent.update({ where: { id }, data: { processingStatus: status, processedAt: new Date() } });
  }

  async handleMomo(operator: string, payload: MomoWebhookPayload, signatureHeader: string | undefined) {
    const signatureValid = verifyHmacSignature(payload, signatureHeader, this.config.get('WEBHOOK_SECRET_MOMO')!);
    const { event, duplicate } = await this.ingest('momo', payload.externalEventId, payload, signatureValid, payload.jalTransactionId);
    if (duplicate) return { ok: true, duplicate: true };
    if (!signatureValid) throw new UnauthorizedException('JAL-ERR-WEBHOOK-002: invalid signature');

    const attempt = await this.prisma.paymentAttempt.findFirst({
      where: { jalTransactionId: payload.jalTransactionId, direction: payload.direction, status: { in: ['PENDING', 'UNKNOWN'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (attempt) {
      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: payload.status === 'CONFIRMED' ? 'CONFIRMED' : 'FAILED', confirmedAt: payload.status === 'CONFIRMED' ? new Date() : undefined },
      });
    }

    if (payload.status === 'CONFIRMED') {
      if (payload.direction === 'IN') await this.buyService.advanceAfterPaymentConfirmed(payload.jalTransactionId);
      else await this.sellService.advanceAfterPayoutConfirmed(payload.jalTransactionId);
    } else {
      await this.handleMomoFailure(payload);
    }

    await this.markProcessed(event!.id, 'PROCESSED');
    return { ok: true };
  }

  private async handleMomoFailure(payload: MomoWebhookPayload) {
    if (payload.direction === 'IN') {
      // TDS §4.1: a confirmed payment-init failure goes straight to ÉCHEC — no failover concept for the client's own payment.
      await this.stateMachine.transition({
        jalTransactionId: payload.jalTransactionId,
        type: 'achat',
        from: 'paiementEnAttente',
        to: 'echec',
        triggeredBy: 'webhook',
        eventType: 'PAYMENT_FAILED_CONFIRMED',
      });
    } else {
      // Sell payout failure — TDS §4.2: "Échec confirmé → nouvelle tentative
      // contrôlée" is a controlled retry, not automatic here; escalate to
      // Operations rather than silently retrying an unattended payout.
      await this.stateMachine.transition({
        jalTransactionId: payload.jalTransactionId,
        type: 'vente',
        from: 'paiementMobileMoneyEnCours',
        to: 'interventionRequise',
        triggeredBy: 'webhook',
        eventType: 'PAYOUT_FAILED_CONFIRMED',
      });
    }
  }

  async handleProvider(providerId: string, payload: ProviderWebhookPayload, signatureHeader: string | undefined) {
    const secret = this.config.get('WEBHOOK_SECRET_PROVIDER')!;
    const signatureValid = verifyHmacSignature(payload, signatureHeader, secret);
    const { event, duplicate } = await this.ingest('provider', payload.externalEventId, payload, signatureValid, payload.jalTransactionId);
    if (duplicate) return { ok: true, duplicate: true };
    if (!signatureValid) throw new UnauthorizedException('JAL-ERR-WEBHOOK-002: invalid signature');

    const order = await this.prisma.providerOrder.findFirst({ where: { providerId, providerOrderId: payload.providerOrderId } });
    if (order) {
      // Delegate to verifyProviderOrder so there is exactly one code path
      // that updates ProviderOrder + advances the state machine on
      // confirmation, whether triggered by webhook or manual verification.
      await this.engine.verifyProviderOrder(payload.jalTransactionId, order.idempotencyKey);
    }

    await this.markProcessed(event!.id, order ? 'PROCESSED' : 'IGNORED');
    return { ok: true };
  }

  async handleBlockchain(network: string, payload: BlockchainWebhookPayload, signatureHeader: string | undefined) {
    const secret = this.config.get('WEBHOOK_SECRET_BLOCKCHAIN')!;
    const signatureValid = verifyHmacSignature(payload, signatureHeader, secret);
    const { event, duplicate } = await this.ingest('blockchain', payload.externalEventId, payload, signatureValid, payload.jalTransactionId);
    if (duplicate) return { ok: true, duplicate: true };
    if (!signatureValid) throw new UnauthorizedException('JAL-ERR-WEBHOOK-002: invalid signature');

    // No real chain-webhook provider is under contract — this re-checks the
    // watcher (poll-based in this scaffold) rather than trusting arbitrary
    // webhook fields for amounts/confirmations (TDS §12 anti-replay + §9).
    await this.sellService.pollDeposit(payload.jalTransactionId);
    await this.sellService.pollConfirmations(payload.jalTransactionId);

    await this.markProcessed(event!.id, 'PROCESSED');
    return { ok: true };
  }
}

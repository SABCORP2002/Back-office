import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma.service';
import { StateMachineService } from '../state-machine/state-machine.service';
import { PricingService } from '../pricing-engine/pricing.service';
import { NotificationService } from '../notification-system/notification.service';
import { ProviderAdapterRegistry } from '../provider-adapters/provider-adapter.registry';
import { ChainWatcherRegistry } from '../blockchain-monitoring/chain-watcher.registry';
import { TransactionEngineService } from './transaction-engine.service';
import { CreateSellDto } from './dto/create-sell.dto';
import { generateJalTransactionId } from '../common/jal-id.util';
import { roundAsset } from '../common/money.util';

/** UX §7 (Sell Flow), TDS §4.2/§3.1. */
@Injectable()
export class SellService {
  private readonly logger = new Logger(SellService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: StateMachineService,
    private readonly pricing: PricingService,
    private readonly notifications: NotificationService,
    private readonly providerAdapters: ProviderAdapterRegistry,
    private readonly chainWatchers: ChainWatcherRegistry,
    private readonly engine: TransactionEngineService,
  ) {}

  async create(userId: string, dto: CreateSellDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.kycStatus !== 'APPROVED') {
      throw new ForbiddenException('KYC must be approved before selling (TDS §4.2 "Conditions requises")');
    }

    const ctx = { country: user.country, crypto: dto.crypto, network: dto.network };
    const { provider, providerRate } = await this.engine.resolveProviderRate(ctx, dto.fiatCurrency, dto.cryptoAmount);
    const quote = await this.pricing.generateQuote({ ...ctx, fiatCurrency: dto.fiatCurrency, direction: 'vente', providerRate });
    const locked = await this.pricing.lockQuote(quote.id);

    const adapter = this.providerAdapters.get(provider.name);
    const { address: depositAddress } = await adapter.generateDepositAddress({ crypto: dto.crypto, network: dto.network });

    const fiatAmountExpected = roundAsset(new Decimal(dto.cryptoAmount).mul(locked.jalRateClient), dto.fiatCurrency);
    const jalTransactionId = generateJalTransactionId();

    const tx = await this.prisma.transaction.create({
      data: {
        jalTransactionId,
        userId,
        type: 'vente',
        status: 'commandeCreee',
        crypto: dto.crypto,
        network: dto.network,
        fiatCurrency: dto.fiatCurrency,
        fiatAmountExpected,
        cryptoAmountExpected: dto.cryptoAmount,
        jalRateLocked: locked.jalRateClient,
        jalMargin: locked.jalMargin,
        depositAddressGenerated: depositAddress,
        momoOperator: dto.momoOperator,
        momoNumber: dto.momoNumber,
        providerId: provider.id,
        quoteId: locked.id,
      },
    });

    await this.prisma.transactionEvent.create({
      data: { jalTransactionId, eventType: 'COMMANDE_CREEE', newStatus: 'commandeCreee', triggeredBy: 'system' },
    });

    await this.stateMachine.transition({
      jalTransactionId,
      type: 'vente',
      from: 'commandeCreee',
      to: 'enAttenteDeCrypto',
      triggeredBy: 'system',
      eventType: 'DEPOSIT_INSTRUCTIONS_SHOWN',
    });

    return this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId: tx.jalTransactionId } });
  }

  /**
   * Polls for the client's on-chain deposit (SELL-009). Real deployments
   * wire this to blockchain-monitoring's actual watcher event stream; here
   * it's callable directly (dev/tests) since no real RPC exists yet.
   */
  async pollDeposit(jalTransactionId: string) {
    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
    if (!tx.depositAddressGenerated) return null;

    const watcher = this.chainWatchers.get(tx.network);
    const detected = await watcher.detectIncoming({ address: tx.depositAddressGenerated });
    if (!detected) return null;

    const existing = await this.prisma.blockchainTransaction.findUnique({ where: { txHash: detected.txHash } });
    if (existing) return existing;

    const record = await this.prisma.blockchainTransaction.create({
      data: {
        jalTransactionId,
        network: tx.network,
        direction: 'INCOMING',
        amountExpected: tx.cryptoAmountExpected,
        txHash: detected.txHash,
        amountDetected: detected.amountDetected,
        status: 'DETECTED',
        detectedAt: new Date(),
      },
    });

    const applied = await this.stateMachine.transition({
      jalTransactionId,
      type: 'vente',
      from: 'enAttenteDeCrypto',
      to: 'cryptoDetectee',
      triggeredBy: 'job',
      eventType: 'CRYPTO_DETECTED',
      sourceReference: detected.txHash,
    });
    if (applied.applied) await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'vente', 'cryptoDetectee');
    return record;
  }

  /**
   * Polls confirmation count on a detected deposit. On reaching the
   * required threshold: JAL-ERR-CHAIN-003 amount check first (TDS §4.2 —
   * "montant reçu conforme au montant attendu"), then triggers payout.
   */
  async pollConfirmations(jalTransactionId: string) {
    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId }, include: { user: true } });
    const deposit = await this.prisma.blockchainTransaction.findFirst({
      where: { jalTransactionId, direction: 'INCOMING', status: 'DETECTED' },
    });
    if (!deposit?.txHash) return null;

    const watcher = this.chainWatchers.get(tx.network);
    const confirmations = await watcher.getConfirmations(deposit.txHash);
    await this.prisma.blockchainTransaction.update({ where: { id: deposit.id }, data: { confirmations } });

    if (confirmations < watcher.requiredConfirmations()) return { confirmations, sufficient: false };

    const amountMatches = deposit.amountDetected != null && new Decimal(deposit.amountDetected).equals(new Decimal(tx.cryptoAmountExpected));
    if (!amountMatches) {
      this.logger.warn(`Amount mismatch on ${jalTransactionId}: detected ${deposit.amountDetected}, expected ${tx.cryptoAmountExpected} — JAL-ERR-CHAIN-003`);
      await this.stateMachine.transition({
        jalTransactionId,
        type: 'vente',
        from: 'cryptoDetectee',
        to: 'interventionRequise',
        triggeredBy: 'job',
        eventType: 'AMOUNT_MISMATCH',
      });
      return { confirmations, sufficient: true, amountMatches: false };
    }

    await this.prisma.blockchainTransaction.update({ where: { id: deposit.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
    const applied = await this.stateMachine.transition({
      jalTransactionId,
      type: 'vente',
      from: 'cryptoDetectee',
      to: 'confirmationsBlockchainSuffisantes',
      triggeredBy: 'job',
      eventType: 'CONFIRMATIONS_SUFFICIENT',
    });
    if (applied.applied) {
      await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'vente', 'confirmationsBlockchainSuffisantes');
      await this.triggerPayout(jalTransactionId, tx.user.country, tx.momoOperator!, tx.momoNumber!, Number(tx.fiatAmountExpected), tx.fiatCurrency);
    }
    return { confirmations, sufficient: true, amountMatches: true };
  }

  private async triggerPayout(jalTransactionId: string, country: string, operator: string, phoneNumber: string, amount: number, currency: string) {
    const advanced = await this.stateMachine.transition({
      jalTransactionId,
      type: 'vente',
      from: 'confirmationsBlockchainSuffisantes',
      to: 'paiementMobileMoneyEnCours',
      triggeredBy: 'system',
      eventType: 'PAYOUT_INITIATED',
    });
    if (!advanced.applied) return;

    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
    await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'vente', 'paiementMobileMoneyEnCours');

    await this.engine.initiateMomo({ jalTransactionId, direction: 'OUT', operator, country, phoneNumber, amount, currency });
    // PENDING/UNKNOWN: awaits webhook. A confirmed FAILED payout is handled
    // by webhooks-gateway's handleMomoFailure() once the webhook confirms
    // it — never assumed here (Arch §3).
  }

  /** Called by webhooks-gateway once Mobile Money confirms the payout (TDS §4.2 row 6). */
  async advanceAfterPayoutConfirmed(jalTransactionId: string) {
    const applied = await this.stateMachine.transition({
      jalTransactionId,
      type: 'vente',
      from: 'paiementMobileMoneyEnCours',
      to: 'paiementEffectue',
      triggeredBy: 'webhook',
      eventType: 'PAYOUT_CONFIRMED',
    });
    if (applied.applied) {
      const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
      await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'vente', 'paiementEffectue');
    }
    return applied;
  }

  /** TDS §4.2: paiement effectué + réconciliation confirms -> TERMINEE. Called by reconciliation-engine. */
  async advanceToTerminee(jalTransactionId: string) {
    const applied = await this.stateMachine.transition({
      jalTransactionId,
      type: 'vente',
      from: 'paiementEffectue',
      to: 'terminee',
      triggeredBy: 'job',
      eventType: 'RECONCILED',
    });
    if (applied.applied) {
      const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
      await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'vente', 'terminee');
    }
    return applied;
  }
}

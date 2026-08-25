import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma.service';
import { StateMachineService } from '../state-machine/state-machine.service';
import { PricingService } from '../pricing-engine/pricing.service';
import { NotificationService } from '../notification-system/notification.service';
import { WalletsService } from '../wallets/wallets.service';
import { TransactionEngineService } from './transaction-engine.service';
import { CreateBuyDto } from './dto/create-buy.dto';
import { generateJalTransactionId } from '../common/jal-id.util';
import { roundAsset } from '../common/money.util';

/** UX §6 (Buy Flow), TDS §4.1/§2.1. */
@Injectable()
export class BuyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: StateMachineService,
    private readonly pricing: PricingService,
    private readonly notifications: NotificationService,
    private readonly wallets: WalletsService,
    private readonly engine: TransactionEngineService,
  ) {}

  async create(userId: string, dto: CreateBuyDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.kycStatus !== 'APPROVED') {
      throw new ForbiddenException('KYC must be approved before buying (TDS §4.1 "Conditions requises")');
    }
    if (!dto.confirmedAddressAndNetwork) {
      throw new BadRequestException('Address and network confirmation is mandatory before payment (BUY-007)');
    }

    const destinationAddress = await this.resolveDestination(userId, dto);

    const ctx = { country: user.country, crypto: dto.crypto, network: dto.network };
    const { provider, providerRate } = await this.engine.resolveProviderRate(ctx, dto.fiatCurrency, dto.fiatAmount);
    const quote = await this.pricing.generateQuote({ ...ctx, fiatCurrency: dto.fiatCurrency, direction: 'achat', providerRate });
    const locked = await this.pricing.lockQuote(quote.id);

    const cryptoAmountExpected = roundAsset(new Decimal(dto.fiatAmount).div(locked.jalRateClient), dto.crypto);
    const jalTransactionId = generateJalTransactionId();

    const tx = await this.prisma.transaction.create({
      data: {
        jalTransactionId,
        userId,
        type: 'achat',
        status: 'commandeCreee',
        crypto: dto.crypto,
        network: dto.network,
        fiatCurrency: dto.fiatCurrency,
        fiatAmountExpected: dto.fiatAmount,
        cryptoAmountExpected,
        jalRateLocked: locked.jalRateClient,
        jalMargin: locked.jalMargin,
        destinationWalletAddress: destinationAddress,
        momoOperator: dto.momoOperator,
        momoNumber: dto.momoNumber,
        providerId: provider.id,
        quoteId: locked.id,
      },
    });

    await this.prisma.transactionEvent.create({
      data: { jalTransactionId, eventType: 'COMMANDE_CREEE', newStatus: 'commandeCreee', triggeredBy: 'system' },
    });

    await this.initiatePayment(tx.jalTransactionId, user.country, dto);

    return this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
  }

  private async resolveDestination(userId: string, dto: CreateBuyDto): Promise<string> {
    if (dto.walletId) {
      const wallet = await this.wallets.get(userId, dto.walletId);
      return wallet.address;
    }
    if (dto.newWalletAddress) {
      const wallet = await this.wallets.getOrCreate(userId, {
        label: dto.newWalletLabel || 'Nouvelle adresse',
        crypto: dto.crypto,
        network: dto.network,
        address: dto.newWalletAddress,
      });
      return wallet.address;
    }
    throw new BadRequestException('walletId or newWalletAddress is required (BUY-005/006)');
  }

  private async initiatePayment(jalTransactionId: string, country: string, dto: CreateBuyDto) {
    const outcome = await this.engine.initiateMomo({
      jalTransactionId,
      direction: 'IN',
      operator: dto.momoOperator,
      country,
      phoneNumber: dto.momoNumber,
      amount: dto.fiatAmount,
      currency: dto.fiatCurrency,
    });

    if (outcome.status === 'FAILED') {
      // TDS §4.1: "Échec d'initiation → ÉCHEC directement, aucun paiement engagé".
      await this.stateMachine.transition({
        jalTransactionId,
        type: 'achat',
        from: 'commandeCreee',
        to: 'echec',
        triggeredBy: 'system',
        eventType: 'PAYMENT_INITIATION_FAILED',
      });
      return;
    }

    // PENDING or UNKNOWN (timeout) — the instruction was sent either way;
    // confirmation arrives via webhook (UNKNOWN just means unconfirmed, not failed).
    await this.stateMachine.transition({
      jalTransactionId,
      type: 'achat',
      from: 'commandeCreee',
      to: 'paiementEnAttente',
      triggeredBy: 'system',
      eventType: 'PAYMENT_INITIATED',
    });
  }

  /** Called by webhooks-gateway once Mobile Money confirms the payment (TDS §4.1 row 3). */
  async advanceAfterPaymentConfirmed(jalTransactionId: string) {
    const applied = await this.stateMachine.transition({
      jalTransactionId,
      type: 'achat',
      from: 'paiementEnAttente',
      to: 'paiementRecu',
      triggeredBy: 'webhook',
      eventType: 'PAYMENT_CONFIRMED',
    });
    if (!applied.applied) return applied; // already moved on — no-op (TDS §5.1 mechanism #2)

    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId }, include: { user: true } });
    await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'achat', 'paiementRecu');

    // TDS §4.1 row 4: selecting the provider + createOrder() is itself the
    // action that advances to CRYPTO_EN_COURS_ENVOI.
    const advanced = await this.stateMachine.transition({
      jalTransactionId,
      type: 'achat',
      from: 'paiementRecu',
      to: 'cryptoEnCoursEnvoi',
      triggeredBy: 'system',
      eventType: 'PROVIDER_ORDER_INITIATED',
    });
    if (!advanced.applied) return advanced;
    await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'achat', 'cryptoEnCoursEnvoi');

    const result = await this.engine.createProviderOrderWithFailover({
      jalTransactionId,
      type: 'achat',
      ctx: { country: tx.user.country, crypto: tx.crypto, network: tx.network },
      direction: 'BUY_SEND',
      amount: Number(tx.cryptoAmountExpected),
      destination: tx.destinationWalletAddress!,
    });

    if (result.outcome === 'confirmed-success') {
      const sent = await this.stateMachine.transition({
        jalTransactionId,
        type: 'achat',
        from: 'cryptoEnCoursEnvoi',
        to: 'cryptoEnvoyee',
        triggeredBy: 'system',
        eventType: 'CRYPTO_SENT',
      });
      if (sent.applied) await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'achat', 'cryptoEnvoyee');
    }
    return result;
  }

  /** TDS §4.1: crypto sent + reconciliation confirms -> TERMINEE. Called by reconciliation-engine. */
  async advanceToTerminee(jalTransactionId: string) {
    const applied = await this.stateMachine.transition({
      jalTransactionId,
      type: 'achat',
      from: 'cryptoEnvoyee',
      to: 'terminee',
      triggeredBy: 'job',
      eventType: 'RECONCILED',
    });
    if (applied.applied) {
      const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { jalTransactionId } });
      await this.notifications.notifyTransactionEvent(tx.userId, jalTransactionId, 'achat', 'terminee');
    }
    return applied;
  }
}

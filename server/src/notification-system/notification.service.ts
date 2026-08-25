import { Injectable } from '@nestjs/common';
import { TxStatus, TxType } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { copyFor } from './copy';

/**
 * UX §16: "Chaque notification est liée à un événement réel de transaction."
 * Called by transaction-engine/webhooks-gateway/reconciliation-engine right
 * after a state-machine transition is applied — never speculatively.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyTransactionEvent(userId: string, jalTransactionId: string, type: TxType, newStatus: TxStatus) {
    const copy = copyFor(type, newStatus);
    if (!copy) return null; // no client-facing copy for this status — silent by design
    return this.prisma.notification.create({
      data: {
        userId,
        jalTransactionId,
        title: copy.title,
        body: copy.body(jalTransactionId),
      },
    });
  }

  async notifyKycApproved(userId: string, tierLabel: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        title: 'Vérification KYC approuvée',
        body: `Votre compte est maintenant vérifié au palier ${tierLabel}.`,
      },
    });
  }

  /** Generic admin-triggered notification (e.g. "Demander nouveau KYC") — not tied to a transaction event. */
  async notifyCustom(userId: string, title: string, body: string) {
    return this.prisma.notification.create({ data: { userId, title, body } });
  }

  async list(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KycStatus, KycTier, UserStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit-logs/audit.service';
import { NotificationService } from '../notification-system/notification.service';

/**
 * Utilisateurs (back-office) — not one of the TDS/UX spec's named ADM-*
 * screens, but a natural extension: `User.status` (ACTIVE/SUSPENDED) is
 * already TDS §1 schema, it just never had a back-office surface to manage
 * it from before this mockup.
 */
@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async stats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, newThisMonth, active, suspended] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
    ]);
    return { total, newThisMonth, active, suspended };
  }

  async list(filters: { country?: string; status?: UserStatus; kycStatus?: KycStatus; search?: string }) {
    const users = await this.prisma.user.findMany({
      where: {
        country: filters.country,
        status: filters.status,
        kycStatus: filters.kycStatus,
        OR: filters.search ? [{ phone: { contains: filters.search } }, { email: { contains: filters.search } }] : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = users.map((u) => u.id);
    const agg = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: { _all: true },
      _sum: { fiatAmountExpected: true },
      _max: { createdAt: true },
    });
    const byUser = new Map(agg.map((a) => [a.userId, a]));

    return users.map((u) => {
      const a = byUser.get(u.id);
      return {
        ...u,
        transactionCount: a?._count._all ?? 0,
        totalVolume: a?._sum.fiatAmountExpected?.toString() ?? '0',
        lastActivityAt: a?._max.createdAt ?? null,
      };
    });
  }

  async detail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: true,
        momoMethods: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        adminNotes: { orderBy: { createdAt: 'desc' }, include: { admin: { select: { email: true } } } },
        kycSubmissions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const achatCount = user.transactions.filter((t) => t.type === 'achat').length;
    const venteCount = user.transactions.filter((t) => t.type === 'vente').length;
    const totalVolume = user.transactions.reduce((acc, t) => acc + Number(t.fiatAmountExpected), 0);

    return {
      ...user,
      summary: {
        transactionCount: user.transactions.length,
        achatCount,
        venteCount,
        totalVolume,
        averageVolume: user.transactions.length ? totalVolume / user.transactions.length : 0,
        lastActivityAt: user.transactions[0]?.createdAt ?? null,
      },
    };
  }

  async suspend(userId: string, adminId: string, justification: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status === 'SUSPENDED') throw new BadRequestException('User already suspended');
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
    await this.audit.record({ adminId, actionType: 'SUSPEND_USER', jalTransactionId: undefined, oldValue: { status: user.status }, newValue: { status: 'SUSPENDED' }, justification });
    return { ok: true };
  }

  async reactivate(userId: string, adminId: string, justification: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status === 'ACTIVE') throw new BadRequestException('User already active');
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    await this.audit.record({ adminId, actionType: 'REACTIVATE_USER', oldValue: { status: user.status }, newValue: { status: 'ACTIVE' }, justification });
    return { ok: true };
  }

  async modifyTier(userId: string, adminId: string, tier: KycTier, justification: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.user.update({ where: { id: userId }, data: { kycTier: tier } });
    await this.audit.record({ adminId, actionType: 'MODIFY_KYC', oldValue: { kycTier: user.kycTier }, newValue: { kycTier: tier }, justification });
    return { ok: true };
  }

  async addNote(userId: string, adminId: string, note: string) {
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.prisma.userNote.create({ data: { userId, adminId, note } });
  }

  /** "Demander nouveau KYC" — resets status so the client's KYC flow re-triggers, and notifies them. */
  async requestNewKyc(userId: string, adminId: string, justification: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.user.update({ where: { id: userId }, data: { kycStatus: 'NOT_STARTED' } });
    await this.audit.record({ adminId, actionType: 'MODIFY_KYC', oldValue: { kycStatus: user.kycStatus }, newValue: { kycStatus: 'NOT_STARTED' }, justification });
    await this.notifications.notifyCustom(userId, 'Nouvelle vérification requise', 'Veuillez soumettre à nouveau vos documents KYC.');
    return { ok: true };
  }
}

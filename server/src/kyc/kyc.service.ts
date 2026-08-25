import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KycRiskLevel, KycTier } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { NotificationService } from '../notification-system/notification.service';
import { AuditService } from '../audit-logs/audit.service';

/** UX §3.2 — KYC-001…012. */
@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async submit(userId: string, input: {
    countryOfResidence: string;
    nationality: string;
    documentType: string;
    frontDocRef?: string;
    backDocRef?: string;
    selfieRef?: string;
  }) {
    const submission = await this.prisma.kycSubmission.create({ data: { userId, ...input, status: 'PENDING' } });
    await this.prisma.user.update({ where: { id: userId }, data: { kycStatus: 'PENDING' } });
    return submission;
  }

  async status(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const latest = await this.prisma.kycSubmission.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { kycStatus: user.kycStatus, kycTier: user.kycTier, latestSubmission: latest };
  }

  // --- Admin (Arch §10 MODIFY_KYC — requires justification) ---

  /** KYC & Conformité top stat cards. */
  async adminStats() {
    const [pending, approved, rejected, manualReview, approvedLastWeek] = await Promise.all([
      this.prisma.kycSubmission.count({ where: { status: 'PENDING' } }),
      this.prisma.kycSubmission.count({ where: { status: 'APPROVED' } }),
      this.prisma.kycSubmission.count({ where: { status: 'REJECTED' } }),
      this.prisma.kycSubmission.count({ where: { status: 'PENDING', riskLevel: 'HIGH' } }),
      this.prisma.kycSubmission.count({ where: { status: { in: ['APPROVED', 'REJECTED'] } } }),
    ]);
    const approvalRate = approvedLastWeek ? Number(((approved / approvedLastWeek) * 100).toFixed(1)) : 0;
    return { pending, approved, rejected, manualReview, approvalRatePct: approvalRate };
  }

  /**
   * KYC-* tabs. "Revue manuelle" isn't a distinct KycStatus value in the
   * schema — it's PENDING submissions the admin already flagged HIGH risk,
   * a real (not invented) filter over existing fields.
   */
  async adminListByTab(
    tab: 'pending' | 'approved' | 'rejected' | 'manual_review',
    filters: { country?: string; documentType?: string; riskLevel?: KycRiskLevel; search?: string },
  ) {
    const statusFilter = tab === 'pending' || tab === 'manual_review' ? 'PENDING' : tab === 'approved' ? 'APPROVED' : 'REJECTED';
    return this.prisma.kycSubmission.findMany({
      where: {
        status: statusFilter,
        riskLevel: tab === 'manual_review' ? 'HIGH' : filters.riskLevel,
        countryOfResidence: filters.country,
        documentType: filters.documentType,
        user: filters.search ? { OR: [{ phone: { contains: filters.search } }, { email: { contains: filters.search } }] } : undefined,
      },
      include: { user: { select: { id: true, phone: true, email: true, country: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminSubmissionDetail(submissionId: string) {
    const submission = await this.prisma.kycSubmission.findUnique({ where: { id: submissionId }, include: { user: true } });
    if (!submission) throw new NotFoundException(`KYC submission ${submissionId} not found`);
    return submission;
  }

  async setRiskLevel(submissionId: string, adminId: string, riskLevel: KycRiskLevel) {
    const submission = await this.prisma.kycSubmission.findUniqueOrThrow({ where: { id: submissionId } });
    const updated = await this.prisma.kycSubmission.update({ where: { id: submissionId }, data: { riskLevel } });
    await this.audit.record({ adminId, actionType: 'MODIFY_KYC_RISK', jalTransactionId: undefined, oldValue: { riskLevel: submission.riskLevel }, newValue: { riskLevel }, justification: `Niveau de risque ajusté à ${riskLevel}` });
    return updated;
  }

  async adminApprove(submissionId: string, adminId: string, tier: KycTier, justification: string) {
    const submission = await this.prisma.kycSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException(`KYC submission ${submissionId} not found`);

    const [, user] = await this.prisma.$transaction([
      this.prisma.kycSubmission.update({
        where: { id: submissionId },
        data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: submission.userId }, data: { kycStatus: 'APPROVED', kycTier: tier } }),
    ]);

    await this.audit.record({
      adminId,
      actionType: 'MODIFY_KYC_APPROVE',
      justification,
      newValue: { userId: submission.userId, tier },
    });
    await this.notifications.notifyKycApproved(user.id, tierLabel(tier));
    return user;
  }

  async adminReject(submissionId: string, adminId: string, reason: string) {
    const submission = await this.prisma.kycSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException(`KYC submission ${submissionId} not found`);
    if (!reason) throw new BadRequestException('A rejection reason is required (KYC-010)');

    await this.prisma.$transaction([
      this.prisma.kycSubmission.update({
        where: { id: submissionId },
        data: { status: 'REJECTED', rejectionReason: reason, reviewedBy: adminId, reviewedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: submission.userId }, data: { kycStatus: 'REJECTED' } }),
    ]);

    await this.audit.record({
      adminId,
      actionType: 'MODIFY_KYC_REJECT',
      justification: reason,
      newValue: { userId: submission.userId },
    });
    return { ok: true };
  }

  /** "Demander plus d'infos" — flags the submission back to the client without a hard reject. */
  async requestMoreInfo(submissionId: string, adminId: string, message: string) {
    const submission = await this.prisma.kycSubmission.findUniqueOrThrow({ where: { id: submissionId } });
    await this.audit.record({ adminId, actionType: 'MODIFY_KYC_REQUEST_INFO', jalTransactionId: undefined, justification: message });
    await this.notifications.notifyCustom(submission.userId, 'Informations complémentaires requises', message);
    return { ok: true };
  }
}

function tierLabel(tier: KycTier): string {
  return { NONE: 'Aucun', BASIC: 'Basique', STANDARD: 'Standard', ADVANCED: 'Avancé' }[tier];
}

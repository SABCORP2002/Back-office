import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export interface RecordActionInput {
  adminId: string;
  actionType: string;
  jalTransactionId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  justification: string;
  ipAddress?: string;
  requiresDualValidation?: boolean;
  coValidatedBy?: string;
}

/**
 * Arch §11 / TDS §15 — append-only at the application layer: this service
 * never exposes an update/delete method, on purpose. The stronger
 * guarantee (a DB role with INSERT-only grants, so even a compromised
 * app account can't rewrite history) is documented and scripted in
 * docs/hardening/audit-role.sql but not applied by the default dev
 * migration — see that file for why.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordActionInput) {
    return this.prisma.adminAction.create({
      data: {
        adminId: input.adminId,
        actionType: input.actionType,
        jalTransactionId: input.jalTransactionId,
        oldValue: (input.oldValue ?? undefined) as Prisma.InputJsonValue,
        newValue: (input.newValue ?? undefined) as Prisma.InputJsonValue,
        justification: input.justification,
        ipAddress: input.ipAddress,
        requiresDualValidation: input.requiresDualValidation ?? false,
        coValidatedBy: input.coValidatedBy,
      },
    });
  }

  async listForTransaction(jalTransactionId: string) {
    return this.prisma.adminAction.findMany({ where: { jalTransactionId }, orderBy: { performedAt: 'asc' } });
  }

  /** Paramètres & Sécurité — "Journaux d'activité récente". */
  async listRecent(limit = 50) {
    return this.prisma.adminAction.findMany({
      include: { admin: { select: { email: true, role: true } } },
      orderBy: { performedAt: 'desc' },
      take: limit,
    });
  }
}

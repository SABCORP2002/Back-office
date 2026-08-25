import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReconciliationResult } from '@prisma/client';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { PrismaService } from '../common/prisma.service';
import { ReconciliationService } from './reconciliation.service';

/** UX §4.7 — ADM-FIN-001. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/reconciliation')
export class ReconciliationAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  @Get()
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  list(@Query('result') result?: ReconciliationResult) {
    return this.prisma.reconciliationRecord.findMany({
      where: { result },
      include: { transaction: { select: { userId: true, type: true, status: true } } },
      orderBy: { runAt: 'desc' },
      take: 200,
    });
  }

  @Get(':jalTransactionId')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  history(@Param('jalTransactionId') jalTransactionId: string) {
    return this.prisma.reconciliationRecord.findMany({ where: { jalTransactionId }, orderBy: { runAt: 'desc' } });
  }

  @Post(':jalTransactionId/run')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  runNow(@Param('jalTransactionId') jalTransactionId: string) {
    return this.reconciliation.runForTransaction(jalTransactionId);
  }
}

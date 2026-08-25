import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { CurrentAdmin } from '../admin-security/current-admin.decorator';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { TransactionsService } from './transactions.service';
import { TransactionAdminActionsService } from './transaction-admin-actions.service';
import { AdminListQueryDto, ForceProviderDto, InterveneDto, TriggerRefundDto } from './dto/admin-actions.dto';

/** UX §4.2 — ADM-TXN-001…006. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/transactions')
export class TransactionsAdminController {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly actions: TransactionAdminActionsService,
  ) {}

  @Get()
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  list(@Query() query: AdminListQueryDto) {
    return this.transactions.adminList(query);
  }

  /** Must come before the `:id` route below or Nest would match "export" as an id. */
  @Get('export')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  async export(@Query() query: AdminListQueryDto, @Res() res: Response) {
    const csv = await this.transactions.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="jal-trade-transactions.csv"');
    res.send(csv);
  }

  @Get(':id')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  detail(@Param('id') id: string) {
    return this.transactions.adminDetail(id);
  }

  @Get(':id/timeline')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  timeline(@Param('id') id: string) {
    return this.transactions.adminTimeline(id);
  }

  @Post(':id/intervene')
  @RequireAction(AdminAction.CHANGE_TRANSACTION_STATUS)
  intervene(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: InterveneDto, @Req() req: Request) {
    return this.actions.intervene(id, admin.adminId, { ...dto, ipAddress: req.ip });
  }

  @Post(':id/force-provider')
  @RequireAction(AdminAction.FORCE_PROVIDER)
  forceProvider(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: ForceProviderDto) {
    return this.actions.forceProvider(id, admin.adminId, dto);
  }

  /** ADM-TXN-005 — was missing a route entirely; the service method already existed. */
  @Post(':id/retry')
  @RequireAction(AdminAction.CHANGE_TRANSACTION_STATUS)
  retry(@Param('id') id: string) {
    return this.actions.retryVerification(id);
  }

  @Post(':id/refund')
  @RequireAction(AdminAction.TRIGGER_REFUND)
  refund(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: TriggerRefundDto, @Req() req: Request) {
    return this.actions.triggerRefund(id, admin.adminId, { ...dto, ipAddress: req.ip });
  }
}

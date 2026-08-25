import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { CurrentAdmin } from '../admin-security/current-admin.decorator';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { FinanceService } from './finance.service';
import { DateRangeQueryDto, RequestWithdrawalDto } from './dto/finance.dto';

/** Finance & Rapports (back-office) — mockup-driven, not a named ADM-* screen (ADM-FIN-002/003 in the spec are V2-priority; this pass builds the real V1 equivalent). Finance/AdminSystem only. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/finance')
export class FinanceAdminController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  @RequireAction(AdminAction.MODIFY_PRICING)
  summary(@Query() query: DateRangeQueryDto) {
    return this.finance.summary(query.dateFrom ? new Date(query.dateFrom) : undefined, query.dateTo ? new Date(query.dateTo) : undefined);
  }

  @Get('period-breakdown')
  @RequireAction(AdminAction.MODIFY_PRICING)
  periodBreakdown(@Query() query: DateRangeQueryDto) {
    const from = query.dateFrom ? new Date(query.dateFrom) : new Date(Date.now() - 7 * 86_400_000);
    const to = query.dateTo ? new Date(query.dateTo) : new Date();
    return this.finance.periodBreakdown(from, to);
  }

  @Get('export')
  @RequireAction(AdminAction.MODIFY_PRICING)
  async export(@Query() query: DateRangeQueryDto, @Res() res: Response) {
    const csv = await this.finance.exportTransactionsCsv(query.dateFrom ? new Date(query.dateFrom) : undefined, query.dateTo ? new Date(query.dateTo) : undefined);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="jal-trade-transactions.csv"');
    res.send(csv);
  }

  @Get('withdrawals')
  @RequireAction(AdminAction.MODIFY_PRICING)
  listWithdrawals() {
    return this.finance.listWithdrawals();
  }

  @Post('withdrawals')
  @RequireAction(AdminAction.MODIFY_PRICING)
  requestWithdrawal(@CurrentAdmin() admin: { adminId: string }, @Body() dto: RequestWithdrawalDto) {
    return this.finance.requestWithdrawal(admin.adminId, dto.amount, dto.currency, dto.destination, dto.justification);
  }

  @Patch('withdrawals/:id/paid')
  @RequireAction(AdminAction.MODIFY_PRICING)
  markPaid(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }) {
    return this.finance.markWithdrawalPaid(id, admin.adminId);
  }
}

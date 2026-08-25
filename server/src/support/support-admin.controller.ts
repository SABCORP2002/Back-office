import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { CurrentAdmin } from '../admin-security/current-admin.decorator';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction as AdminActionPermission } from '../admin-security/permission-matrix';
import { SupportService } from './support.service';

/** UX §4.6 — ADM-SUP-001…005. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/support')
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  /** ADM-SUP-001 "Recherche de transaction — Par JAL Transaction ID, client, ou référence externe". */
  @Get('tickets')
  @RequireAction(AdminActionPermission.VIEW_TRANSACTION)
  search(@Query('jalTransactionId') jalTransactionId?: string, @Query('userId') userId?: string) {
    return this.support.adminSearch({ jalTransactionId, userId });
  }

  /** ADM-SUP-002 "Vue client" — activity history, saved Mobile Money methods, saved wallets. */
  @Get('clients/:userId')
  @RequireAction(AdminActionPermission.VIEW_TRANSACTION)
  clientView(@Param('userId') userId: string) {
    return this.support.adminClientView(userId);
  }

  @Get('tickets/:id')
  @RequireAction(AdminActionPermission.VIEW_TRANSACTION)
  detail(@Param('id') id: string) {
    return this.support.adminGetDetail(id);
  }

  @Patch('tickets/:id/status')
  @RequireAction(AdminActionPermission.VIEW_TRANSACTION)
  updateStatus(@Param('id') id: string, @Body('status') status: TicketStatus) {
    return this.support.adminUpdateStatus(id, status);
  }

  @Post('tickets/:id/notes')
  @RequireAction(AdminActionPermission.VIEW_TRANSACTION)
  addNote(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body('note') note: string) {
    return this.support.adminAddNote(id, admin.adminId, note);
  }
}

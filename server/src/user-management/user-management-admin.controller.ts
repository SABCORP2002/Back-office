import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { CurrentAdmin } from '../admin-security/current-admin.decorator';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { UserManagementService } from './user-management.service';
import { AddUserNoteDto, AdminJustificationDto, ListUsersQueryDto, ModifyTierDto } from './dto/user-management.dto';

/** Utilisateurs (back-office) — mockup-driven, not a named ADM-* screen. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/users')
export class UserManagementAdminController {
  constructor(private readonly users: UserManagementService) {}

  @Get('stats')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  stats() {
    return this.users.stats();
  }

  @Get()
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  detail(@Param('id') id: string) {
    return this.users.detail(id);
  }

  @Patch(':id/suspend')
  @RequireAction(AdminAction.MODIFY_KYC)
  suspend(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: AdminJustificationDto) {
    return this.users.suspend(id, admin.adminId, dto.justification);
  }

  @Patch(':id/reactivate')
  @RequireAction(AdminAction.MODIFY_KYC)
  reactivate(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: AdminJustificationDto) {
    return this.users.reactivate(id, admin.adminId, dto.justification);
  }

  @Patch(':id/tier')
  @RequireAction(AdminAction.MODIFY_KYC)
  modifyTier(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: ModifyTierDto) {
    return this.users.modifyTier(id, admin.adminId, dto.tier, dto.justification);
  }

  @Post(':id/request-kyc')
  @RequireAction(AdminAction.MODIFY_KYC)
  requestKyc(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: AdminJustificationDto) {
    return this.users.requestNewKyc(id, admin.adminId, dto.justification);
  }

  @Post(':id/notes')
  @RequireAction(AdminAction.MODIFY_KYC)
  addNote(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: AddUserNoteDto) {
    return this.users.addNote(id, admin.adminId, dto.note);
  }
}

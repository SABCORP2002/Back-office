import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { PlatformSettingsService } from './platform-settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditService } from '../audit-logs/audit.service';

/** Paramètres & Sécurité — mockup-driven, not a named ADM-* screen. ADMIN_SYSTEM-only (platform-wide config). */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/settings')
export class PlatformSettingsAdminController {
  constructor(
    private readonly settings: PlatformSettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequireAction(AdminAction.MODIFY_ROUTING)
  get() {
    return this.settings.get();
  }

  @Patch()
  @RequireAction(AdminAction.MODIFY_ROUTING)
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }

  /** "Journaux d'activité récente". */
  @Get('activity-logs')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  activityLogs(@Query('limit') limit?: string) {
    return this.audit.listRecent(limit ? Number(limit) : undefined);
  }
}

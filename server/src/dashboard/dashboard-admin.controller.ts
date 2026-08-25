import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { DashboardService } from './dashboard.service';

/** Back-office Dashboard (home) — not itemized as an ADM-* screen in the spec, but the mockup's first/default page. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/dashboard')
export class DashboardAdminController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  summary() {
    return this.dashboard.summary();
  }

  @Get('charts')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  charts(@Query('range') range: '7d' | '30d' | '90d' = '7d') {
    return this.dashboard.charts(range);
  }

  @Get('alerts')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  alerts() {
    return this.dashboard.alerts();
  }
}

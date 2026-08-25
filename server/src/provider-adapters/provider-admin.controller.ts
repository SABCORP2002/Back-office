import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { CurrentAdmin } from '../admin-security/current-admin.decorator';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { ProviderConfigService } from './provider-config.service';
import { CreateProviderConfigDto, UpdateProviderConfigDto } from './dto/provider-config.dto';

/** UX §4.3 — ADM-PROV-001…004. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/providers')
export class ProviderAdminController {
  constructor(private readonly providers: ProviderConfigService) {}

  @Get()
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  list() {
    return this.providers.list();
  }

  @Get(':id')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  detail(@Param('id') id: string) {
    return this.providers.detail(id);
  }

  /** "Tester toutes les connexions". */
  @Post('test-connections')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  testConnections() {
    return this.providers.testAllConnections();
  }

  @Post()
  @RequireAction(AdminAction.TOGGLE_PROVIDER)
  create(@Body() dto: CreateProviderConfigDto) {
    return this.providers.create(dto);
  }

  @Patch(':id')
  @RequireAction(AdminAction.TOGGLE_PROVIDER)
  update(@Param('id') id: string, @Body() dto: UpdateProviderConfigDto) {
    return this.providers.update(id, dto);
  }

  @Patch(':id/toggle')
  @RequireAction(AdminAction.TOGGLE_PROVIDER)
  toggle(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body('active') active: boolean) {
    return this.providers.toggle(id, active, admin.adminId);
  }
}

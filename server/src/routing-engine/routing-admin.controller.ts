import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { RoutingRuleService } from './routing-rule.service';
import { CreateRoutingRuleDto } from './dto/routing-rule.dto';

/** UX §4.4 — ADM-ROUTE-001…006. MODIFY_ROUTING is ADMIN_SYSTEM-only per Arch §10. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/routing')
export class RoutingAdminController {
  constructor(private readonly rules: RoutingRuleService) {}

  @Get('rules')
  @RequireAction(AdminAction.MODIFY_ROUTING)
  list() {
    return this.rules.list();
  }

  @Post('rules')
  @RequireAction(AdminAction.MODIFY_ROUTING)
  create(@Body() dto: CreateRoutingRuleDto) {
    return this.rules.create(dto);
  }

  @Patch('rules/:id/active')
  @RequireAction(AdminAction.MODIFY_ROUTING)
  setActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.rules.setActive(id, active);
  }

  @Delete('rules/:id')
  @RequireAction(AdminAction.MODIFY_ROUTING)
  remove(@Param('id') id: string) {
    return this.rules.delete(id);
  }
}

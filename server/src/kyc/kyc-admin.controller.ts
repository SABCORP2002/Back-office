import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { KycRiskLevel, KycTier } from '@prisma/client';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { CurrentAdmin } from '../admin-security/current-admin.decorator';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { KycService } from './kyc.service';

/** KYC & Conformité (back-office) — Arch §10's "Modifier une donnée KYC, avec justification". */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/kyc')
export class KycAdminController {
  constructor(private readonly kyc: KycService) {}

  @Get('stats')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  stats() {
    return this.kyc.adminStats();
  }

  @Get('submissions')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  list(
    @Query('tab') tab: 'pending' | 'approved' | 'rejected' | 'manual_review' = 'pending',
    @Query('country') country?: string,
    @Query('documentType') documentType?: string,
    @Query('riskLevel') riskLevel?: KycRiskLevel,
    @Query('search') search?: string,
  ) {
    return this.kyc.adminListByTab(tab, { country, documentType, riskLevel, search });
  }

  @Get('submissions/:id')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  detail(@Param('id') id: string) {
    return this.kyc.adminSubmissionDetail(id);
  }

  @Post('submissions/:id/risk-level')
  @RequireAction(AdminAction.MODIFY_KYC)
  setRiskLevel(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body('riskLevel') riskLevel: KycRiskLevel) {
    return this.kyc.setRiskLevel(id, admin.adminId, riskLevel);
  }

  @Post('submissions/:id/approve')
  @RequireAction(AdminAction.MODIFY_KYC)
  approve(
    @Param('id') id: string,
    @CurrentAdmin() admin: { adminId: string },
    @Body() body: { tier: KycTier; justification: string },
  ) {
    return this.kyc.adminApprove(id, admin.adminId, body.tier, body.justification);
  }

  @Post('submissions/:id/reject')
  @RequireAction(AdminAction.MODIFY_KYC)
  reject(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() body: { reason: string }) {
    return this.kyc.adminReject(id, admin.adminId, body.reason);
  }

  @Post('submissions/:id/request-info')
  @RequireAction(AdminAction.MODIFY_KYC)
  requestInfo(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body('message') message: string) {
    return this.kyc.requestMoreInfo(id, admin.adminId, message);
  }
}

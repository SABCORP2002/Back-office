import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { KycAdminController } from './kyc-admin.controller';
import { NotificationSystemModule } from '../notification-system/notification-system.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdminSecurityModule } from '../admin-security/admin-security.module';

@Module({
  imports: [NotificationSystemModule, AuditLogsModule, AdminSecurityModule],
  controllers: [KycController, KycAdminController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}

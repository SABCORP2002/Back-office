import { Module } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformSettingsAdminController } from './platform-settings-admin.controller';
import { AdminSecurityModule } from '../admin-security/admin-security.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AdminSecurityModule, AuditLogsModule],
  controllers: [PlatformSettingsAdminController],
  providers: [PlatformSettingsService],
})
export class PlatformSettingsModule {}

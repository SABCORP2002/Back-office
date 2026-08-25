import { Module } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { UserManagementAdminController } from './user-management-admin.controller';
import { AdminSecurityModule } from '../admin-security/admin-security.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationSystemModule } from '../notification-system/notification-system.module';

@Module({
  imports: [AdminSecurityModule, AuditLogsModule, NotificationSystemModule],
  controllers: [UserManagementAdminController],
  providers: [UserManagementService],
})
export class UserManagementModule {}

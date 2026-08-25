import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceAdminController } from './finance-admin.controller';
import { AdminSecurityModule } from '../admin-security/admin-security.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AdminSecurityModule, AuditLogsModule],
  controllers: [FinanceAdminController],
  providers: [FinanceService],
})
export class FinanceModule {}

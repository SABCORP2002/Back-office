import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardAdminController } from './dashboard-admin.controller';
import { AdminSecurityModule } from '../admin-security/admin-security.module';

@Module({
  imports: [AdminSecurityModule],
  controllers: [DashboardAdminController],
  providers: [DashboardService],
})
export class DashboardModule {}

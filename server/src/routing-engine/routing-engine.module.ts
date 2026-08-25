import { Module } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { RoutingRuleService } from './routing-rule.service';
import { RoutingAdminController } from './routing-admin.controller';
import { AdminSecurityModule } from '../admin-security/admin-security.module';

@Module({
  imports: [AdminSecurityModule],
  controllers: [RoutingAdminController],
  providers: [RoutingService, RoutingRuleService],
  exports: [RoutingService],
})
export class RoutingEngineModule {}

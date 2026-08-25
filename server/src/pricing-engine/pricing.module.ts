import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingConfigService } from './pricing-config.service';
import { PricingAdminController } from './pricing-admin.controller';
import { AdminSecurityModule } from '../admin-security/admin-security.module';
import { ProviderAdaptersModule } from '../provider-adapters/provider-adapters.module';

@Module({
  imports: [AdminSecurityModule, ProviderAdaptersModule],
  controllers: [PricingAdminController],
  providers: [PricingService, PricingConfigService],
  exports: [PricingService],
})
export class PricingModule {}

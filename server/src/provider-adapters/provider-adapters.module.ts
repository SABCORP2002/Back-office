import { Module } from '@nestjs/common';
import { FakeProviderAdapter } from './fake-provider.adapter';
import { YellowCardAdapter } from './yellow-card.adapter';
import { ProviderAdapterRegistry } from './provider-adapter.registry';
import { ProviderConfigService } from './provider-config.service';
import { ProviderAdminController } from './provider-admin.controller';
import { AdminSecurityModule } from '../admin-security/admin-security.module';

@Module({
  imports: [AdminSecurityModule],
  controllers: [ProviderAdminController],
  providers: [FakeProviderAdapter, YellowCardAdapter, ProviderAdapterRegistry, ProviderConfigService],
  exports: [ProviderAdapterRegistry, ProviderConfigService],
})
export class ProviderAdaptersModule {}

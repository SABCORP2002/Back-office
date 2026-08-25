import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma.module';
import { CommonModule } from './common/common.module';

import { AuthModule } from './auth/auth.module';
import { KycModule } from './kyc/kyc.module';
import { WalletsModule } from './wallets/wallets.module';
import { MobileMoneyMethodsModule } from './mobile-money-methods/mobile-money-methods.module';

import { StateMachineModule } from './state-machine/state-machine.module';
import { PricingModule } from './pricing-engine/pricing.module';
import { RoutingEngineModule } from './routing-engine/routing-engine.module';
import { ProviderAdaptersModule } from './provider-adapters/provider-adapters.module';
import { MobileMoneyAdaptersModule } from './mobile-money-adapters/mobile-money-adapters.module';
import { BlockchainMonitoringModule } from './blockchain-monitoring/blockchain-monitoring.module';
import { TransactionEngineModule } from './transaction-engine/transaction-engine.module';
import { WebhooksGatewayModule } from './webhooks-gateway/webhooks-gateway.module';
import { ReconciliationEngineModule } from './reconciliation-engine/reconciliation-engine.module';
import { NotificationSystemModule } from './notification-system/notification-system.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AdminSecurityModule } from './admin-security/admin-security.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SupportModule } from './support/support.module';

// Back-office web app support — mockup-driven additions, not named ADM-* screens in the spec (see ARCHITECTURE.md).
import { DashboardModule } from './dashboard/dashboard.module';
import { UserManagementModule } from './user-management/user-management.module';
import { CountriesModule } from './countries/countries.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';
import { FinanceModule } from './finance/finance.module';

/**
 * Every module here traces back to one of the 12 components in Arch §1, or
 * a supporting domain module the frontend needs that the TDS doesn't name
 * explicitly (auth, kyc, wallets, mobile-money-methods, transactions,
 * support) — see ARCHITECTURE.md for the full map.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,

    AuthModule,
    KycModule,
    WalletsModule,
    MobileMoneyMethodsModule,

    StateMachineModule,
    PricingModule,
    RoutingEngineModule,
    ProviderAdaptersModule,
    MobileMoneyAdaptersModule,
    BlockchainMonitoringModule,
    TransactionEngineModule,
    WebhooksGatewayModule,
    ReconciliationEngineModule,
    NotificationSystemModule,
    AuditLogsModule,
    AdminSecurityModule,
    TransactionsModule,
    SupportModule,

    DashboardModule,
    UserManagementModule,
    CountriesModule,
    PlatformSettingsModule,
    FinanceModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TransactionEngineService } from './transaction-engine.service';
import { TransactionEngineController } from './transaction-engine.controller';
import { BuyService } from './buy.service';
import { SellService } from './sell.service';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { PricingModule } from '../pricing-engine/pricing.module';
import { RoutingEngineModule } from '../routing-engine/routing-engine.module';
import { ProviderAdaptersModule } from '../provider-adapters/provider-adapters.module';
import { MobileMoneyAdaptersModule } from '../mobile-money-adapters/mobile-money-adapters.module';
import { BlockchainMonitoringModule } from '../blockchain-monitoring/blockchain-monitoring.module';
import { NotificationSystemModule } from '../notification-system/notification-system.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    StateMachineModule,
    PricingModule,
    RoutingEngineModule,
    ProviderAdaptersModule,
    MobileMoneyAdaptersModule,
    BlockchainMonitoringModule,
    NotificationSystemModule,
    WalletsModule,
  ],
  controllers: [TransactionEngineController],
  providers: [TransactionEngineService, BuyService, SellService],
  exports: [TransactionEngineService, BuyService, SellService],
})
export class TransactionEngineModule {}

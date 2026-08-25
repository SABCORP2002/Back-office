import { Module } from '@nestjs/common';
import { FakeMomoAdapter } from './fake-momo.adapter';
import { TranzakAdapter } from './tranzak.adapter';
import { PaydunyaAdapter } from './paydunya.adapter';
import { ElyonpayAdapter } from './elyonpay.adapter';
import { MomoAdapterRegistry } from './momo-adapter.registry';

@Module({
  providers: [FakeMomoAdapter, TranzakAdapter, PaydunyaAdapter, ElyonpayAdapter, MomoAdapterRegistry],
  exports: [MomoAdapterRegistry],
})
export class MobileMoneyAdaptersModule {}

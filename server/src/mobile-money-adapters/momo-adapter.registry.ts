import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { MomoAdapter } from './momo-adapter.interface';
import { FakeMomoAdapter } from './fake-momo.adapter';
import { TranzakAdapter } from './tranzak.adapter';
import { PaydunyaAdapter } from './paydunya.adapter';
import { ElyonpayAdapter } from './elyonpay.adapter';

@Injectable()
export class MomoAdapterRegistry implements OnModuleInit {
  private readonly adapters: MomoAdapter[] = [];

  constructor(
    private readonly fakeMomoAdapter: FakeMomoAdapter,
    private readonly tranzakAdapter: TranzakAdapter,
    private readonly paydunyaAdapter: PaydunyaAdapter,
    private readonly elyonpayAdapter: ElyonpayAdapter,
  ) {}

  onModuleInit() {
    // FakeMomoAdapter.supports() matches every operator/country, so it's
    // deliberately registered FIRST — it wins `.find()` and stays the
    // working default. Tranzak/Paydunya/Elyonpay are real credential-wired
    // adapters whose transactional methods still throw
    // NotImplementedException pending their API docs (see each file);
    // registering them ahead of Fake right now would make every
    // Cameroun/Sénégal/etc. Buy or Sell fail instead of succeed. Once a
    // real adapter's methods are implemented, move it above
    // `fakeMomoAdapter` here to make it the active choice for its coverage
    // — no other code needs to change.
    this.adapters.push(this.fakeMomoAdapter, this.tranzakAdapter, this.paydunyaAdapter, this.elyonpayAdapter);
  }

  resolve(operator: string, country: string): MomoAdapter {
    const adapter = this.adapters.find((a) => a.supports(operator, country));
    if (!adapter) throw new NotFoundException(`No Mobile Money adapter for ${operator} (${country})`);
    return adapter;
  }
}

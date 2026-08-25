import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ProviderAdapter } from './provider-adapter.interface';
import { FakeProviderAdapter } from './fake-provider.adapter';
import { YellowCardAdapter } from './yellow-card.adapter';

/**
 * Arch §14 — "Yellow Card, Izichange ou tout autre fournisseur ne sont que
 * des connecteurs." Routing-engine asks this registry for an adapter by
 * `ProviderConfig.name`; adding a real provider later means writing one
 * class and registering it here, never touching routing/transaction-engine.
 */
@Injectable()
export class ProviderAdapterRegistry implements OnModuleInit {
  private readonly adapters = new Map<string, ProviderAdapter>();

  constructor(
    private readonly fakeProviderAdapter: FakeProviderAdapter,
    private readonly yellowCardAdapter: YellowCardAdapter,
  ) {}

  onModuleInit() {
    this.register(this.fakeProviderAdapter);
    this.register(this.yellowCardAdapter);
  }

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): ProviderAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) throw new NotFoundException(`No provider adapter registered for "${name}"`);
    return adapter;
  }

  all(): ProviderAdapter[] {
    return [...this.adapters.values()];
  }
}

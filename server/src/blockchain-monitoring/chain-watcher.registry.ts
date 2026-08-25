import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainWatcher } from './watcher.interface';
import { FakeChainWatcher } from './fake-chain-watcher';

/** One watcher instance per network, lazily created and cached (state must persist across polls). */
@Injectable()
export class ChainWatcherRegistry {
  private readonly watchers = new Map<string, FakeChainWatcher>();

  constructor(private readonly config: ConfigService) {}

  get(network: string): ChainWatcher {
    if (!this.watchers.has(network)) {
      this.watchers.set(network, new FakeChainWatcher(network, this.config));
    }
    return this.watchers.get(network)!;
  }

  /** Dev-only escape hatch for scripts/tests that need `simulateDeposit`. */
  getFake(network: string): FakeChainWatcher {
    return this.get(network) as FakeChainWatcher;
  }
}

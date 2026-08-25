import { Module } from '@nestjs/common';
import { ChainWatcherRegistry } from './chain-watcher.registry';

@Module({
  providers: [ChainWatcherRegistry],
  exports: [ChainWatcherRegistry],
})
export class BlockchainMonitoringModule {}

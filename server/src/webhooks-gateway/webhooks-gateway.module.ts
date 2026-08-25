import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { TransactionEngineModule } from '../transaction-engine/transaction-engine.module';
import { StateMachineModule } from '../state-machine/state-machine.module';

@Module({
  imports: [TransactionEngineModule, StateMachineModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksGatewayModule {}

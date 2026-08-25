import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsAdminController } from './transactions-admin.controller';
import { TransactionAdminActionsService } from './transaction-admin-actions.service';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RoutingEngineModule } from '../routing-engine/routing-engine.module';
import { TransactionEngineModule } from '../transaction-engine/transaction-engine.module';
import { AdminSecurityModule } from '../admin-security/admin-security.module';

@Module({
  imports: [StateMachineModule, AuditLogsModule, RoutingEngineModule, TransactionEngineModule, AdminSecurityModule],
  controllers: [TransactionsController, TransactionsAdminController],
  providers: [TransactionsService, TransactionAdminActionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}

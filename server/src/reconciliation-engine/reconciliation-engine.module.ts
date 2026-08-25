import { Module } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationAdminController } from './reconciliation-admin.controller';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { TransactionEngineModule } from '../transaction-engine/transaction-engine.module';
import { AdminSecurityModule } from '../admin-security/admin-security.module';

@Module({
  imports: [StateMachineModule, TransactionEngineModule, AdminSecurityModule],
  controllers: [ReconciliationAdminController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationEngineModule {}

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TransactionsService } from './transactions.service';

/** UX §3.8 — TXN-001…004. */
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.transactions.listForUser(user.userId);
  }

  @Get(':jalTransactionId')
  get(@CurrentUser() user: { userId: string }, @Param('jalTransactionId') jalTransactionId: string) {
    return this.transactions.getForUser(user.userId, jalTransactionId);
  }
}

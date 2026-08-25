import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

/** UX §3.9/§17 — SUP-001…006, FLOW 12. */
@UseGuards(JwtAuthGuard)
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateTicketDto) {
    return this.support.createTicket(user.userId, dto.subject, dto.jalTransactionId, dto.description, dto.proofRef);
  }

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.support.listForUser(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.support.getForUser(user.userId, id);
  }
}

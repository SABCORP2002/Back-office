import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

/** UX §3.7 — WALLET-001…006. */
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.wallets.list(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateWalletDto) {
    return this.wallets.create(user.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.wallets.get(user.userId, id);
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.wallets.setDefault(user.userId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.wallets.delete(user.userId, id);
  }
}

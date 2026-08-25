import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { PricingService } from '../pricing-engine/pricing.service';
import { TransactionEngineService } from './transaction-engine.service';
import { BuyService } from './buy.service';
import { SellService } from './sell.service';
import { CreateBuyDto } from './dto/create-buy.dto';
import { CreateSellDto } from './dto/create-sell.dto';
import { PreviewRateDto } from './dto/preview-rate.dto';

/** UX §6/§7 create endpoints + BUY-003/SELL-002 live rate preview. */
@UseGuards(JwtAuthGuard)
@Controller()
export class TransactionEngineController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly engine: TransactionEngineService,
    private readonly buy: BuyService,
    private readonly sell: SellService,
  ) {}

  @Post('quotes/preview')
  async preview(@CurrentUser() user: { userId: string }, @Body() dto: PreviewRateDto) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const { providerRate } = await this.engine.resolveProviderRate({ country: dbUser.country, crypto: dto.crypto, network: dto.network }, dto.fiatCurrency, 1);
    const quoted = await this.pricing.previewRate({ ...dto, country: dbUser.country, providerRate });
    return { jalRateClient: quoted.jalRateClient, expiresInSeconds: 60 };
  }

  @Post('transactions/buy')
  createBuy(@CurrentUser() user: { userId: string }, @Body() dto: CreateBuyDto) {
    return this.buy.create(user.userId, dto);
  }

  @Post('transactions/sell')
  createSell(@CurrentUser() user: { userId: string }, @Body() dto: CreateSellDto) {
    return this.sell.create(user.userId, dto);
  }
}

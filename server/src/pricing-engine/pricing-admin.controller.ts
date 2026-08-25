import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { PricingConfigService } from './pricing-config.service';
import { CompareQuotesDto, CreatePricingConfigDto, RateBreakdownDto, UpdatePricingConfigDto } from './dto/pricing-config.dto';

/** UX §4.5 — ADM-PRICE-001…007. FINANCE or ADMIN_SYSTEM only (Arch §10). */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/pricing')
export class PricingAdminController {
  constructor(private readonly config: PricingConfigService) {}

  @Get()
  @RequireAction(AdminAction.MODIFY_PRICING)
  list() {
    return this.config.list();
  }

  /** ADM-PRICE-001 "Cotations fournisseurs". */
  @Post('quotes/compare')
  @RequireAction(AdminAction.MODIFY_PRICING)
  compareQuotes(@Body() dto: CompareQuotesDto) {
    return this.config.compareProviderQuotes(dto);
  }

  /** ADM-PRICE-002 "Moteur de pricing JAL" — the only place providerRate/margin are ever exposed, deliberately admin-only. */
  @Post('breakdown')
  @RequireAction(AdminAction.MODIFY_PRICING)
  breakdown(@Body() dto: RateBreakdownDto) {
    return this.config.rateBreakdown(dto);
  }

  /** "Évolution du taux fournisseur vs taux client". */
  @Get('rate-history')
  @RequireAction(AdminAction.MODIFY_PRICING)
  rateHistory(@Query('crypto') crypto: string, @Query('network') network: string, @Query('fiatCurrency') fiatCurrency: string, @Query('days') days?: string) {
    return this.config.rateHistory(crypto, network, fiatCurrency, days ? Number(days) : undefined);
  }

  @Post()
  @RequireAction(AdminAction.MODIFY_PRICING)
  create(@Body() dto: CreatePricingConfigDto) {
    return this.config.create(dto);
  }

  @Patch(':id')
  @RequireAction(AdminAction.MODIFY_PRICING)
  update(@Param('id') id: string, @Body() dto: UpdatePricingConfigDto) {
    return this.config.update(id, dto);
  }

  @Delete(':id')
  @RequireAction(AdminAction.MODIFY_PRICING)
  remove(@Param('id') id: string) {
    return this.config.delete(id);
  }
}

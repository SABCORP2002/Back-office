import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-security/admin-auth.guard';
import { PermissionsGuard } from '../admin-security/permissions.guard';
import { RequireAction } from '../admin-security/require-action.decorator';
import { AdminAction } from '../admin-security/permission-matrix';
import { CountriesService } from './countries.service';
import { CreateCountryDto, CreatePaymentMethodDto, UpdateCountryDto, UpdatePaymentMethodDto } from './dto/countries.dto';

/** Pays & Paiements (back-office) — mockup-driven, not a named ADM-* screen. Routing is ADMIN_SYSTEM-only; treat coverage config the same way. */
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin/countries')
export class CountriesAdminController {
  constructor(private readonly countries: CountriesService) {}

  @Get('stats')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  stats() {
    return this.countries.stats();
  }

  @Get()
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  list() {
    return this.countries.list();
  }

  @Get(':id')
  @RequireAction(AdminAction.VIEW_TRANSACTION)
  detail(@Param('id') id: string) {
    return this.countries.detail(id);
  }

  @Post()
  @RequireAction(AdminAction.MODIFY_ROUTING)
  create(@Body() dto: CreateCountryDto) {
    return this.countries.create(dto);
  }

  @Patch(':id')
  @RequireAction(AdminAction.MODIFY_ROUTING)
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.countries.update(id, dto);
  }

  @Post(':id/payment-methods')
  @RequireAction(AdminAction.MODIFY_ROUTING)
  addPaymentMethod(@Param('id') id: string, @Body() dto: CreatePaymentMethodDto) {
    return this.countries.addPaymentMethod(id, dto);
  }

  @Patch('payment-methods/:methodId')
  @RequireAction(AdminAction.MODIFY_ROUTING)
  updatePaymentMethod(@Param('methodId') methodId: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.countries.updatePaymentMethod(methodId, dto);
  }

  @Delete('payment-methods/:methodId')
  @RequireAction(AdminAction.MODIFY_ROUTING)
  deletePaymentMethod(@Param('methodId') methodId: string) {
    return this.countries.deletePaymentMethod(methodId);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { CountryStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/**
 * Pays & Paiements (back-office) — the real catalog backing what was
 * previously only free-text country names and, on the Flutter client, a
 * hardcoded `MobileMoneyCatalog` (frontend/lib/data/mobile_money_catalog.dart).
 * `GET /catalog/countries` is exposed publicly so that hardcoded list can
 * eventually be replaced — not wired into the client this pass.
 */
@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [active, methods, activeMethods] = await Promise.all([
      this.prisma.country.count({ where: { status: 'ACTIVE' } }),
      this.prisma.countryPaymentMethod.count(),
      this.prisma.countryPaymentMethod.count({ where: { active: true } }),
    ]);
    const total = await this.prisma.country.count();
    return { activeCountries: active, totalCountries: total, activePaymentMethods: activeMethods, totalPaymentMethods: methods };
  }

  list() {
    return this.prisma.country.findMany({ include: { paymentMethods: true }, orderBy: { name: 'asc' } });
  }

  /** Public catalog for client apps — country/operator pairs only, no admin-only fields. */
  async publicCatalog() {
    const countries = await this.prisma.country.findMany({
      where: { status: 'ACTIVE' },
      include: { paymentMethods: { where: { active: true } } },
      orderBy: { name: 'asc' },
    });
    return countries.map((c) => ({
      name: c.name,
      code: c.code,
      currency: c.currency,
      operators: c.paymentMethods.map((m) => m.name),
    }));
  }

  async detail(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id }, include: { paymentMethods: true } });
    if (!country) throw new NotFoundException(`Country ${id} not found`);
    return country;
  }

  create(input: { name: string; code: string; currency: string; timezone?: string; kycRequired?: boolean; minAmount?: number; maxAmount?: number; dailyMax?: number; description?: string }) {
    return this.prisma.country.create({ data: { ...input, activatedAt: new Date() } });
  }

  update(id: string, input: Partial<{ status: CountryStatus; timezone: string; kycRequired: boolean; minAmount: number; maxAmount: number; dailyMax: number; description: string }>) {
    return this.prisma.country.update({ where: { id }, data: input });
  }

  addPaymentMethod(countryId: string, input: { name: string; type: string; feePct?: number }) {
    return this.prisma.countryPaymentMethod.create({ data: { countryId, ...input } });
  }

  updatePaymentMethod(id: string, input: Partial<{ active: boolean; feePct: number }>) {
    return this.prisma.countryPaymentMethod.update({ where: { id }, data: input });
  }

  deletePaymentMethod(id: string) {
    return this.prisma.countryPaymentMethod.delete({ where: { id } });
  }
}

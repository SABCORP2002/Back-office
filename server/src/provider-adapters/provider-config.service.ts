import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ProviderAdapterRegistry } from './provider-adapter.registry';

/** UX §4.3 — ADM-PROV-001…004. CRUD over ProviderConfig/ProviderHealth (Arch §14's "fournisseur = simple connecteur"). */
@Injectable()
export class ProviderConfigService {
  private readonly logger = new Logger(ProviderConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: ProviderAdapterRegistry,
  ) {}

  list() {
    return this.prisma.providerConfig.findMany({ include: { health: true }, orderBy: { priority: 'asc' } });
  }

  async detail(id: string) {
    const provider = await this.prisma.providerConfig.findUnique({ where: { id }, include: { health: true } });
    if (!provider) throw new NotFoundException(`Provider ${id} not found`);
    return provider;
  }

  create(input: { name: string; supportedCountries: string[]; supportedCryptos: string[]; supportedNetworks: string[]; priority?: number; webhookSecret?: string }) {
    return this.prisma.providerConfig.create({ data: { ...input, health: { create: { status: 'UP' } } } });
  }

  update(id: string, input: Partial<{ supportedCountries: string[]; supportedCryptos: string[]; supportedNetworks: string[]; priority: number }>) {
    return this.prisma.providerConfig.update({ where: { id }, data: input });
  }

  /** ADM-PROV-003 — "coupe-circuit sans interrompre la plateforme". */
  async toggle(id: string, active: boolean, adminId: string) {
    await this.detail(id);
    await this.prisma.providerConfig.update({ where: { id }, data: { active } });
    return this.prisma.providerHealth.upsert({
      where: { providerId: id },
      create: { providerId: id, status: active ? 'UP' : 'DOWN', disabledManually: !active, disabledBy: active ? null : adminId },
      update: { disabledManually: !active, disabledBy: active ? null : adminId, status: active ? 'UP' : 'DOWN' },
    });
  }

  /** Fournisseurs page "Tester toutes les connexions" — real healthCheck() calls, real latency measurement. */
  async testAllConnections() {
    const providers = await this.prisma.providerConfig.findMany();
    const results = await Promise.all(
      providers.map(async (provider) => {
        let adapter;
        try {
          adapter = this.adapters.get(provider.name);
        } catch {
          return { providerId: provider.id, name: provider.name, status: 'DOWN' as const, latencyMs: null, error: 'No adapter registered' };
        }
        const start = Date.now();
        try {
          const status = await adapter.healthCheck();
          const latencyMs = Date.now() - start;
          await this.prisma.providerHealth.upsert({
            where: { providerId: provider.id },
            create: { providerId: provider.id, status, avgLatencyMs: latencyMs, lastCheckAt: new Date() },
            update: { status, avgLatencyMs: latencyMs, lastCheckAt: new Date() },
          });
          return { providerId: provider.id, name: provider.name, status, latencyMs, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`healthCheck() failed for ${provider.name}: ${message}`);
          await this.prisma.providerHealth.upsert({
            where: { providerId: provider.id },
            create: { providerId: provider.id, status: 'DOWN', lastCheckAt: new Date() },
            update: { status: 'DOWN', lastCheckAt: new Date() },
          });
          return { providerId: provider.id, name: provider.name, status: 'DOWN' as const, latencyMs: null, error: message };
        }
      }),
    );
    return results;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

/** UX §4.4 — ADM-ROUTE-001…006. */
@Injectable()
export class RoutingRuleService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.routingRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(input: { country?: string; crypto?: string; network?: string; forcedProviderId?: string }) {
    return this.prisma.routingRule.create({ data: input });
  }

  setActive(id: string, active: boolean) {
    return this.prisma.routingRule.update({ where: { id }, data: { active } });
  }

  delete(id: string) {
    return this.prisma.routingRule.delete({ where: { id } });
  }
}

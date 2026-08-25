import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/** UX §3.6 (MM-001…011) / FLOW 13 — saved client MoMo methods. Distinct from src/mobile-money-adapters (the operator connector). */
@Injectable()
export class MobileMoneyMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.savedMobileMoneyMethod.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  async create(userId: string, input: { operatorName: string; country: string; phoneNumber: string }) {
    try {
      return await this.prisma.savedMobileMoneyMethod.create({ data: { userId, ...input } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('This Mobile Money number is already saved for this operator');
      }
      throw err;
    }
  }

  async getOrCreate(userId: string, input: { operatorName: string; country: string; phoneNumber: string }) {
    const existing = await this.prisma.savedMobileMoneyMethod.findUnique({
      where: {
        userId_operatorName_phoneNumber: { userId, operatorName: input.operatorName, phoneNumber: input.phoneNumber },
      },
    });
    return existing ?? this.create(userId, input);
  }

  async get(userId: string, id: string) {
    const method = await this.prisma.savedMobileMoneyMethod.findFirst({ where: { id, userId } });
    if (!method) throw new NotFoundException(`Mobile Money method ${id} not found`);
    return method;
  }

  async setDefault(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.$transaction([
      this.prisma.savedMobileMoneyMethod.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.savedMobileMoneyMethod.update({ where: { id }, data: { isDefault: true } }),
    ]);
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.savedMobileMoneyMethod.delete({ where: { id } });
  }
}

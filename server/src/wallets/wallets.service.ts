import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/** UX §3.7 (WALLET-001…006) / FLOW 04 — external addresses only, never a balance. */
@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.wallet.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  async create(userId: string, input: { label: string; crypto: string; network: string; address: string }) {
    try {
      return await this.prisma.wallet.create({ data: { userId, ...input } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('This address is already registered for this crypto/network — WALLET-002 duplicate state');
      }
      throw err;
    }
  }

  /** Used by transaction-engine when the client supplies a brand-new address inline at BUY-006. */
  async getOrCreate(userId: string, input: { label: string; crypto: string; network: string; address: string }) {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId_crypto_network_address: { userId, crypto: input.crypto, network: input.network, address: input.address } },
    });
    return existing ?? this.create(userId, input);
  }

  async get(userId: string, id: string) {
    const wallet = await this.prisma.wallet.findFirst({ where: { id, userId } });
    if (!wallet) throw new NotFoundException(`Wallet ${id} not found`);
    return wallet;
  }

  async setDefault(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.$transaction([
      this.prisma.wallet.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.wallet.update({ where: { id }, data: { isDefault: true } }),
    ]);
  }

  async delete(userId: string, id: string) {
    const wallet = await this.get(userId, id);
    const inUse = await this.prisma.transaction.findFirst({
      where: { destinationWalletAddress: wallet.address, userId, terminalAt: null },
    });
    if (inUse) throw new ConflictException('Bloqué — utilisée par une commande en cours');
    return this.prisma.wallet.delete({ where: { id } });
  }
}

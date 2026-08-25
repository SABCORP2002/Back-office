import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/** UX §3.9/§4.6 — SUP-001…006 (client), ADM-SUP-001…005 (back-office). */
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, subject: string, jalTransactionId?: string, description?: string, proofRef?: string) {
    return this.prisma.supportTicket.create({
      data: { userId, subject, jalTransactionId, description, proofRef },
    });
  }

  /** AUTH-011 / FLOW 15 — no auth session exists yet, so the user is found by identifier. */
  async createRecoveryTicket(identifier: string, note: string) {
    const user = await this.prisma.user.findFirst({ where: { OR: [{ phone: identifier }, { email: identifier }] } });
    if (!user) throw new NotFoundException('No account matches this phone/email');
    return this.createTicket(user.id, 'Récupération de compte', undefined, note);
  }

  async listForUser(userId: string) {
    return this.prisma.supportTicket.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  async getForUser(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, userId }, include: { notes: true } });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  // --- Admin (ADM-SUP-001…005) ---

  async adminSearch(query: { jalTransactionId?: string; userId?: string }) {
    return this.prisma.supportTicket.findMany({
      where: { jalTransactionId: query.jalTransactionId, userId: query.userId },
      include: { user: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** ADM-SUP-003 "Détail du problème signalé" — the ticket itself, linked to a jal_transaction_id. */
  async adminGetDetail(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, include: { user: true, notes: true } });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  /** ADM-SUP-002 "Vue client" — "Historique d'activité, moyens Mobile Money, wallets enregistrés". */
  async adminClientView(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: true,
        momoMethods: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        supportTickets: { orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  async adminUpdateStatus(id: string, status: TicketStatus) {
    return this.prisma.supportTicket.update({ where: { id }, data: { status } });
  }

  async adminAddNote(id: string, adminId: string, note: string) {
    await this.prisma.supportTicket.findUniqueOrThrow({ where: { id } });
    return this.prisma.supportTicketNote.create({ data: { ticketId: id, authorId: adminId, note } });
  }
}

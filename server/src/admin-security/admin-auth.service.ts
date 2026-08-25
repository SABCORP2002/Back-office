import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';

/**
 * ADM-AUTH-001. There's no admin onboarding UI in V1's scope (UX §4.1 lists
 * only the login screen) — a single bootstrap Admin système account is
 * seeded from env on first boot so the back-office isn't a chicken-and-egg
 * problem; every other admin account is created by an existing
 * ADMIN_SYSTEM through prisma/seed.ts or Studio, not through this API.
 *
 * Sessions (`AdminSession`) exist specifically because the back-office is
 * an interactive web app, not just an API caller — a 15-minute access
 * token with no refresh is impractical for that. Login creates a session
 * row; refresh is validated against it (not just JWT expiry), so revoking
 * a session (Paramètres & Sécurité → "Appareils autorisés") takes effect
 * immediately rather than waiting out the refresh token's lifetime.
 */
@Injectable()
export class AdminAuthService implements OnModuleInit {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_BOOTSTRAP_EMAIL');
    const password = this.config.get<string>('ADMIN_BOOTSTRAP_PASSWORD');
    if (!email || !password) return;
    try {
      const existing = await this.prisma.adminUser.findUnique({ where: { email } });
      if (existing) return;
      const passwordHash = await bcrypt.hash(password, 10);
      await this.prisma.adminUser.create({ data: { email, passwordHash, role: 'ADMIN_SYSTEM' } });
      this.logger.log(`Bootstrap admin account ready: ${email}`);
    } catch (err) {
      this.logger.warn(
        `Skipping admin bootstrap — database unreachable at startup: ${err instanceof Error ? err.message.split('\n')[0] : err}`,
      );
    }
  }

  async login(email: string, password: string, meta: { userAgent?: string; ipAddress?: string } = {}) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const session = await this.prisma.adminSession.create({
      data: { adminId: admin.id, userAgent: meta.userAgent, ipAddress: meta.ipAddress },
    });

    const accessToken = await this.signAccessToken(admin.id, admin.role);
    const refreshToken = await this.signRefreshToken(admin.id, session.id);
    return { adminId: admin.id, role: admin.role, accessToken, refreshToken, sessionId: session.id };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; sessionId: string; scope: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.scope !== 'admin') throw new UnauthorizedException('Not an admin refresh token');

    const session = await this.prisma.adminSession.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.revokedAt || session.adminId !== payload.sub) {
      throw new UnauthorizedException('Session revoked or not found — please log in again');
    }
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: payload.sub } });
    await this.prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });

    return { accessToken: await this.signAccessToken(admin.id, admin.role) };
  }

  /** Paramètres & Sécurité — "Gestion des sessions" / "Appareils autorisés". */
  async listSessions(adminId: string) {
    return this.prisma.adminSession.findMany({ where: { adminId, revokedAt: null }, orderBy: { lastSeenAt: 'desc' } });
  }

  async revokeSession(adminId: string, sessionId: string) {
    const session = await this.prisma.adminSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.adminId !== adminId) throw new ForbiddenException('Cannot revoke another admin\'s session');
    return this.prisma.adminSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  private signAccessToken(adminId: string, role: string) {
    return this.jwt.signAsync(
      { sub: adminId, role },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m' },
    );
  }

  private signRefreshToken(adminId: string, sessionId: string) {
    return this.jwt.signAsync(
      { sub: adminId, sessionId, scope: 'admin' },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_TTL') ?? '30d' },
    );
  }
}

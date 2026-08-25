import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { FakeOtpSender } from './fake-otp.sender';

const OTP_TTL_MINUTES = 5;
const BCRYPT_ROUNDS = 10;

/**
 * UX FLOW 01 (Registration) / FLOW 02 (Login) / FLOW 15 (Account Recovery).
 * No SMS/email vendor and no biometric hardware exist server-side — OTP
 * delivery is a FakeOtpSender, PIN/biometric app-lock (AUTH-012) stays a
 * device-local concern the frontend already models in flow_state.dart; this
 * service only issues the PIN a transaction-validation step can check
 * against later (BUY-011/SELL-008).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otpSender: FakeOtpSender,
  ) {}

  async register(input: { phone?: string; email?: string; password: string; country: string }) {
    if (!input.phone && !input.email) throw new BadRequestException('phone or email is required');

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: input.phone ?? undefined }, { email: input.email ?? undefined }] },
    });
    if (existing) throw new ConflictException('An account with this phone/email already exists');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { phone: input.phone, email: input.email, passwordHash, country: input.country },
    });

    const code = await this.issueOtp(user.id, input.phone ?? input.email!);
    // No SMS/email vendor is under contract (CONFIGURABLE) — outside
    // production, hand the code back directly so local/dev/test clients
    // aren't blocked on reading server logs.
    return { userId: user.id, devOtpCode: process.env.NODE_ENV === 'production' ? undefined : code };
  }

  private async issueOtp(userId: string, destination: string): Promise<string> {
    const code = String(randomInt(100000, 999999));
    const otpCodeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { otpCodeHash, otpExpiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000) },
    });
    await this.otpSender.send(destination, code);
    return code;
  }

  async verifyOtp(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.otpCodeHash || !user.otpExpiresAt) throw new BadRequestException('No OTP pending for this account');
    if (user.otpExpiresAt.getTime() < Date.now()) throw new BadRequestException('OTP expired — request a new one');

    const valid = await bcrypt.compare(code, user.otpCodeHash);
    if (!valid) throw new UnauthorizedException('Invalid OTP');

    await this.prisma.user.update({
      where: { id: userId },
      data: { verifiedAt: new Date(), otpCodeHash: null, otpExpiresAt: null },
    });
    return { userId };
  }

  async setPin(userId: string, pin: string) {
    const user = await this.requireVerifiedUser(userId);
    const pinHash = await bcrypt.hash(`${pin}${this.config.get('PIN_PEPPER')}`, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: user.id }, data: { pinHash } });
    return { userId };
  }

  async acceptTerms(userId: string) {
    const user = await this.requireVerifiedUser(userId);
    if (!user.pinHash) throw new BadRequestException('PIN must be set before accepting terms (AUTH-006 precedes AUTH-007)');
    await this.prisma.user.update({ where: { id: user.id }, data: { termsAcceptedAt: new Date() } });
    return this.issueTokens(user.id);
  }

  async login(identifier: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { OR: [{ phone: identifier }, { email: identifier }] } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Account suspended');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      return this.issueTokens(payload.sub, { accessOnly: true });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(identifier: string) {
    const user = await this.prisma.user.findFirst({ where: { OR: [{ phone: identifier }, { email: identifier }] } });
    if (!user) return { ok: true }; // never reveal account existence
    const code = await this.issueOtp(user.id, identifier);
    return { ok: true, userId: user.id, devOtpCode: process.env.NODE_ENV === 'production' ? undefined : code };
  }

  async resetPassword(userId: string, code: string, newPassword: string) {
    await this.verifyOtp(userId, code); // reuses the same OTP verification + clears it
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }

  private async requireVerifiedUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Unknown user');
    if (!user.verifiedAt) throw new BadRequestException('OTP verification required first (AUTH-005)');
    return user;
  }

  private async issueTokens(userId: string, opts: { accessOnly?: boolean } = {}) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m' },
    );
    if (opts.accessOnly) return { accessToken };
    const refreshToken = await this.jwt.signAsync(
      { sub: userId },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_TTL') ?? '30d' },
    );
    return { userId, accessToken, refreshToken };
  }
}

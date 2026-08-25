import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/otp.dto';
import { SetPinDto } from './dto/set-pin.dto';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { ForgotPasswordDto, LoginDto, RecoveryDto, RefreshDto, ResetPasswordDto } from './dto/login.dto';
import { SupportService } from '../support/support.service';

/** UX §3.1 (AUTH-002…012) — FLOW 01/02/15. */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly support: SupportService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.userId, dto.code);
  }

  @Post('pin')
  setPin(@Body() dto: SetPinDto) {
    return this.auth.setPin(dto.userId, dto.pin);
  }

  @Post('terms/accept')
  acceptTerms(@Body() dto: AcceptTermsDto) {
    return this.auth.acceptTerms(dto.userId);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.identifier, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('password/forgot')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.identifier);
  }

  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.userId, dto.code, dto.newPassword);
  }

  /** AUTH-011 / FLOW 15 — routes into support for manual review (ADM-SUP). */
  @Post('recovery')
  async recovery(@Body() dto: RecoveryDto) {
    return this.support.createRecoveryTicket(dto.identifier, dto.note);
  }
}

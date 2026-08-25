import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FakeOtpSender } from './fake-otp.sender';
import { JwtStrategy } from './jwt.strategy';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), SupportModule],
  controllers: [AuthController],
  providers: [AuthService, FakeOtpSender, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

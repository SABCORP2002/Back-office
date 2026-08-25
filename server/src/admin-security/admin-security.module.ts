import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminAuthGuard } from './admin-auth.guard';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy, AdminAuthGuard, PermissionsGuard],
  exports: [AdminAuthService, AdminAuthGuard, PermissionsGuard],
})
export class AdminSecurityModule {}

import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { CurrentAdmin } from './current-admin.decorator';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RefreshAdminDto } from './dto/refresh-admin.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.adminAuth.login(dto.email, dto.password, { userAgent: req.headers['user-agent'], ipAddress: req.ip });
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshAdminDto) {
    return this.adminAuth.refresh(dto.refreshToken);
  }

  @UseGuards(AdminAuthGuard)
  @Get('sessions')
  sessions(@CurrentAdmin() admin: { adminId: string }) {
    return this.adminAuth.listSessions(admin.adminId);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('sessions/:id')
  revoke(@CurrentAdmin() admin: { adminId: string }, @Param('id') id: string) {
    return this.adminAuth.revokeSession(admin.adminId, id);
  }
}

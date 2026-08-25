import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('submit')
  submit(@CurrentUser() user: { userId: string }, @Body() dto: SubmitKycDto) {
    return this.kyc.submit(user.userId, dto);
  }

  @Get('status')
  status(@CurrentUser() user: { userId: string }) {
    return this.kyc.status(user.userId);
  }
}

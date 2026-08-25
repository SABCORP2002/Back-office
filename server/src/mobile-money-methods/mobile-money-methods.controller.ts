import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MobileMoneyMethodsService } from './mobile-money-methods.service';
import { CreateMomoMethodDto } from './dto/create-momo-method.dto';

/** UX §3.6 — MM-001…011. */
@UseGuards(JwtAuthGuard)
@Controller('mobile-money-methods')
export class MobileMoneyMethodsController {
  constructor(private readonly momoMethods: MobileMoneyMethodsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.momoMethods.list(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateMomoMethodDto) {
    return this.momoMethods.create(user.userId, dto);
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.momoMethods.setDefault(user.userId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.momoMethods.delete(user.userId, id);
  }
}

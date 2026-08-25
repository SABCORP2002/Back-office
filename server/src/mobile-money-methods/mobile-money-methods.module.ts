import { Module } from '@nestjs/common';
import { MobileMoneyMethodsService } from './mobile-money-methods.service';
import { MobileMoneyMethodsController } from './mobile-money-methods.controller';

@Module({
  controllers: [MobileMoneyMethodsController],
  providers: [MobileMoneyMethodsService],
  exports: [MobileMoneyMethodsService],
})
export class MobileMoneyMethodsModule {}

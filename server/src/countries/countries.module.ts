import { Module } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CountriesAdminController } from './countries-admin.controller';
import { CountriesPublicController } from './countries-public.controller';
import { AdminSecurityModule } from '../admin-security/admin-security.module';

@Module({
  imports: [AdminSecurityModule],
  controllers: [CountriesAdminController, CountriesPublicController],
  providers: [CountriesService],
})
export class CountriesModule {}

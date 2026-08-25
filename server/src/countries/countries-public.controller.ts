import { Controller, Get } from '@nestjs/common';
import { CountriesService } from './countries.service';

/** Future replacement for the Flutter client's hardcoded mobile_money_catalog.dart — not wired in yet. */
@Controller('catalog')
export class CountriesPublicController {
  constructor(private readonly countries: CountriesService) {}

  @Get('countries')
  publicCatalog() {
    return this.countries.publicCatalog();
  }
}

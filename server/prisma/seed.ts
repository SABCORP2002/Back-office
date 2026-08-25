import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds the one ProviderConfig row that matches FakeProviderAdapter.name —
 * routing.selectProvider() reads from this table, while
 * ProviderAdapterRegistry resolves the actual adapter instance by the same
 * `name` string. Both must agree or every Buy/Sell will 404 on "no eligible
 * provider" (BUY-002.4 / SELL-005 path).
 *
 * Also seeds the Country/CountryPaymentMethod catalog the back-office's
 * "Pays & Paiements" screen needs — matching the countries FakeProviderAdapter
 * already claims to support, so routing and the country catalog agree.
 */
async function main() {
  await prisma.providerConfig.upsert({
    where: { name: 'FakeProvider' },
    create: {
      name: 'FakeProvider',
      supportedCountries: ['Cameroun', 'Sénégal', 'Côte d’Ivoire'],
      supportedCryptos: ['BTC', 'ETH', 'USDT', 'USDC'],
      supportedNetworks: ['TRC20', 'ERC20', 'BEP20', 'Bitcoin'],
      priority: 1,
      health: { create: { status: 'UP' } },
    },
    update: {},
  });
  // eslint-disable-next-line no-console
  console.log('Seeded FakeProvider.');

  const countries: Array<{ name: string; code: string; currency: string; timezone: string; operators: string[] }> = [
    { name: 'Cameroun', code: 'CM', currency: 'XAF', timezone: 'Africa/Douala', operators: ['MTN Mobile Money', 'Orange Money'] },
    { name: 'Sénégal', code: 'SN', currency: 'XOF', timezone: 'Africa/Dakar', operators: ['Orange Money', 'Wave', 'Free Money'] },
    { name: 'Côte d’Ivoire', code: 'CI', currency: 'XOF', timezone: 'Africa/Abidjan', operators: ['Orange Money', 'MTN Mobile Money', 'Moov Money', 'Wave'] },
  ];

  for (const c of countries) {
    const country = await prisma.country.upsert({
      where: { name: c.name },
      create: { name: c.name, code: c.code, currency: c.currency, timezone: c.timezone, activatedAt: new Date() },
      update: {},
    });
    for (const operator of c.operators) {
      await prisma.countryPaymentMethod.upsert({
        where: { countryId_name: { countryId: country.id, name: operator } },
        create: { countryId: country.id, name: operator, type: 'Mobile Money' },
        update: {},
      });
    }
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${countries.length} countries with their Mobile Money operators.`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

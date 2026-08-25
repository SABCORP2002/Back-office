import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const SETTINGS_ID = 'singleton';

/** Paramètres & Sécurité — "Général"/"Notifications"/"Protection avancée" tabs. Single-row upsert, never a second row. */
@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    return this.prisma.platformSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  async update(input: Partial<{
    platformName: string;
    slogan: string;
    contactEmail: string;
    contactPhone: string;
    primaryCurrency: string;
    timezone: string;
    defaultLanguage: string;
    notifyNewTransactions: boolean;
    notifyNewUsers: boolean;
    notifyKycSubmitted: boolean;
    notifyDisputes: boolean;
    notifyDailyReports: boolean;
    notificationEmail: string;
    autoLockMinutes: number;
    requireHttps: boolean;
    ipRestriction: boolean;
  }>) {
    await this.get(); // ensure the row exists
    return this.prisma.platformSettings.update({ where: { id: SETTINGS_ID }, data: input });
  }
}

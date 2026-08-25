import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() platformName?: string;
  @IsOptional() @IsString() slogan?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() primaryCurrency?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() defaultLanguage?: string;
  @IsOptional() @IsBoolean() notifyNewTransactions?: boolean;
  @IsOptional() @IsBoolean() notifyNewUsers?: boolean;
  @IsOptional() @IsBoolean() notifyKycSubmitted?: boolean;
  @IsOptional() @IsBoolean() notifyDisputes?: boolean;
  @IsOptional() @IsBoolean() notifyDailyReports?: boolean;
  @IsOptional() @IsString() notificationEmail?: string;
  @IsOptional() @IsInt() autoLockMinutes?: number;
  @IsOptional() @IsBoolean() requireHttps?: boolean;
  @IsOptional() @IsBoolean() ipRestriction?: boolean;
}

import { CountryStatus } from '@prisma/client';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  kycRequired?: boolean;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsNumber()
  dailyMax?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCountryDto {
  @IsOptional()
  @IsString()
  status?: CountryStatus;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  kycRequired?: boolean;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsNumber()
  dailyMax?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePaymentMethodDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsNumber()
  feePct?: number;
}

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  feePct?: number;
}

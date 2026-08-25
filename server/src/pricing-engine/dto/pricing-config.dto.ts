import { TxType } from '@prisma/client';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePricingConfigDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  crypto?: string;

  @IsOptional()
  @IsString()
  direction?: TxType;

  @IsNumber()
  marginPct!: number;

  @IsOptional()
  @IsNumber()
  marginMinPct?: number;

  @IsOptional()
  @IsNumber()
  marginMaxPct?: number;

  @IsOptional()
  @IsNumber()
  feeFixed?: number;
}

export class UpdatePricingConfigDto {
  @IsOptional()
  @IsNumber()
  marginPct?: number;

  @IsOptional()
  @IsNumber()
  marginMinPct?: number;

  @IsOptional()
  @IsNumber()
  marginMaxPct?: number;

  @IsOptional()
  @IsNumber()
  feeFixed?: number;

  @IsOptional()
  active?: boolean;
}

export class CompareQuotesDto {
  @IsString()
  crypto!: string;

  @IsString()
  network!: string;

  @IsString()
  fiatCurrency!: string;

  @IsNumber()
  amount!: number;
}

export class RateBreakdownDto {
  @IsString()
  crypto!: string;

  @IsString()
  network!: string;

  @IsString()
  fiatCurrency!: string;

  @IsString()
  direction!: TxType;

  @IsString()
  country!: string;

  @IsNumber()
  providerRate!: number;
}

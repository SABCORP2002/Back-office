import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateProviderConfigDto {
  @IsString()
  name!: string;

  @IsArray()
  supportedCountries!: string[];

  @IsArray()
  supportedCryptos!: string[];

  @IsArray()
  supportedNetworks!: string[];

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  webhookSecret?: string;
}

export class UpdateProviderConfigDto {
  @IsOptional()
  @IsArray()
  supportedCountries?: string[];

  @IsOptional()
  @IsArray()
  supportedCryptos?: string[];

  @IsOptional()
  @IsArray()
  supportedNetworks?: string[];

  @IsOptional()
  @IsInt()
  priority?: number;
}

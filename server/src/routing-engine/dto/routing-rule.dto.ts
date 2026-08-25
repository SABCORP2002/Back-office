import { IsOptional, IsString } from 'class-validator';

export class CreateRoutingRuleDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  crypto?: string;

  @IsOptional()
  @IsString()
  network?: string;

  @IsOptional()
  @IsString()
  forcedProviderId?: string;
}

import { IsOptional, IsString } from 'class-validator';

/**
 * Document capture (KYC-004…006) is a stub: no ID-verification vendor is
 * under contract, so these refs are whatever opaque string the client sends
 * (a local path today, a future upload's storage key later) — never parsed
 * or verified server-side in this pass.
 */
export class SubmitKycDto {
  @IsString()
  countryOfResidence!: string;

  @IsString()
  nationality!: string;

  @IsString()
  documentType!: string;

  @IsOptional()
  @IsString()
  frontDocRef?: string;

  @IsOptional()
  @IsString()
  backDocRef?: string;

  @IsOptional()
  @IsString()
  selfieRef?: string;
}

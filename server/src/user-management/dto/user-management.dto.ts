import { KycStatus, KycTier, UserStatus } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  status?: UserStatus;

  @IsOptional()
  @IsString()
  kycStatus?: KycStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminJustificationDto {
  @IsString()
  justification!: string;
}

export class AddUserNoteDto {
  @IsString()
  note!: string;
}

/** "Modifier les limites" — KycTier is what actually determines Buy/Sell limits (UX §3.2 KYC-011). */
export class ModifyTierDto {
  @IsString()
  tier!: KycTier;

  @IsString()
  justification!: string;
}

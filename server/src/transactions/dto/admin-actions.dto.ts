import { TxStatus } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class InterveneDto {
  @IsString()
  targetStatus!: TxStatus;

  @IsString()
  justification!: string;
}

export class ForceProviderDto {
  @IsString()
  providerId!: string;

  @IsString()
  justification!: string;
}

export class TriggerRefundDto {
  @IsString()
  reason!: string;

  @IsString()
  destination!: string;

  @IsOptional()
  @IsString()
  coValidatedBy?: string;
}

export class AdminListQueryDto {
  @IsOptional()
  @IsString()
  status?: TxStatus;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  /** ADM-TXN-001 "Filtrer par statut/pays/fournisseur/date" — country lives on User, joined in the service. */
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

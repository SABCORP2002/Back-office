import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** BUY-002…010 collapsed into one submit — the client already collects every step locally before this call (Arch §6, "aucun paiement n'est initié tant que JAL ne connaît pas tout"). */
export class CreateBuyDto {
  @IsString()
  crypto!: string;

  @IsString()
  network!: string;

  @IsString()
  fiatCurrency!: string;

  @IsNumber()
  @Min(0.01)
  fiatAmount!: number;

  @IsOptional()
  @IsString()
  walletId?: string;

  @IsOptional()
  @IsString()
  newWalletLabel?: string;

  @IsOptional()
  @IsString()
  newWalletAddress?: string;

  @IsString()
  momoOperator!: string;

  @IsString()
  momoNumber!: string;

  /** The mandatory BUY-007 checkbox — "Je confirme que cette adresse et ce réseau sont corrects." */
  @IsBoolean()
  confirmedAddressAndNetwork!: boolean;
}

import { IsIn, IsString } from 'class-validator';

export class PreviewRateDto {
  @IsString()
  crypto!: string;

  @IsString()
  network!: string;

  @IsString()
  fiatCurrency!: string;

  @IsIn(['achat', 'vente'])
  direction!: 'achat' | 'vente';
}

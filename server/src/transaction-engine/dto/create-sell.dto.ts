import { IsNumber, IsString, Min } from 'class-validator';

export class CreateSellDto {
  @IsString()
  crypto!: string;

  @IsString()
  network!: string;

  @IsString()
  fiatCurrency!: string;

  @IsNumber()
  @Min(0.00000001)
  cryptoAmount!: number;

  @IsString()
  momoOperator!: string;

  @IsString()
  momoNumber!: string;
}

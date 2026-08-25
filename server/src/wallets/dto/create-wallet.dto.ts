import { IsString } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  label!: string;

  @IsString()
  crypto!: string;

  @IsString()
  network!: string;

  @IsString()
  address!: string;
}

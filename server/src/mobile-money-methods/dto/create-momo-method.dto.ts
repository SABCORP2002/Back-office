import { IsString } from 'class-validator';

export class CreateMomoMethodDto {
  @IsString()
  operatorName!: string;

  @IsString()
  country!: string;

  @IsString()
  phoneNumber!: string;
}

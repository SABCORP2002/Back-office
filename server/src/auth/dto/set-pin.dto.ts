import { IsString, Length } from 'class-validator';

export class SetPinDto {
  @IsString()
  userId!: string;

  @IsString()
  @Length(4, 6)
  pin!: string;
}

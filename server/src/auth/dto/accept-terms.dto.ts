import { IsString } from 'class-validator';

export class AcceptTermsDto {
  @IsString()
  userId!: string;
}

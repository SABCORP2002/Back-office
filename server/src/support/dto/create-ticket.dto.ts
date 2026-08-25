import { IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  jalTransactionId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  proofRef?: string;
}

import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DateRangeQueryDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class RequestWithdrawalDto {
  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsString()
  destination!: string;

  @IsString()
  justification!: string;
}

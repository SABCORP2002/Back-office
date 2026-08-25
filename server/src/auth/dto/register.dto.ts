import { IsEmail, IsString, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @ValidateIf((o) => !o.email)
  @IsString()
  phone?: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  country!: string;
}

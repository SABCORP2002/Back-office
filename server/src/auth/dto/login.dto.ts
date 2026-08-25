import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  identifier!: string; // phone or email

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsString()
  identifier!: string;
}

export class ResetPasswordDto {
  @IsString()
  userId!: string;

  @IsString()
  code!: string;

  @IsString()
  newPassword!: string;
}

export class RecoveryDto {
  @IsString()
  identifier!: string;

  @IsString()
  note!: string;
}

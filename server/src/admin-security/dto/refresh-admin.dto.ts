import { IsString } from 'class-validator';

export class RefreshAdminDto {
  @IsString()
  refreshToken!: string;
}

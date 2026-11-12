import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  /** Widget response token. Required whenever a CAPTCHA provider is configured (enforced in AuthService). */
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  captchaToken?: string;
}

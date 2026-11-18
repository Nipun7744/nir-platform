import { OtpChannel } from '@prisma/client';
import { IsEmail, IsEnum, IsPhoneNumber, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

/**
 * Forgot password, step 2 — check the code sent by POST /auth/password/forgot (which takes the
 * same body as registration's SendOtpDto). The identifier must be the one the code was sent to.
 */
export class VerifyResetCodeDto {
  @IsEnum(OtpChannel)
  channel!: OtpChannel;

  @ValidateIf((o: VerifyResetCodeDto) => o.channel === OtpChannel.EMAIL)
  @IsEmail()
  email?: string;

  @ValidateIf((o: VerifyResetCodeDto) => o.channel === OtpChannel.SMS)
  @IsPhoneNumber('BD', { message: 'Enter a valid Bangladeshi mobile number' })
  phone?: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits' })
  code!: string;
}

/** Forgot password, step 3 — set the new password with the token step 2 returned. */
export class ResetPasswordDto {
  @IsString()
  @MaxLength(2048)
  resetToken!: string;

  /** Same rule as registration (RegisterDto.password). */
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must be at most 128 characters long' })
  password!: string;

  /** Must equal `password` — checked in AuthService.resetPassword(). */
  @IsString()
  confirmPassword!: string;
}

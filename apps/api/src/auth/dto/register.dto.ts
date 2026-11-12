import { IsArray, IsEmail, IsEnum, IsIn, IsOptional, IsPhoneNumber, IsString, Matches, MinLength } from 'class-validator';
import { OtpChannel, Role } from '@prisma/client';

const SELF_SERVICE_ROLES = [Role.INVESTOR, Role.MENTOR, Role.MINISTRY_FOCAL_POINT] as const;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  fullName!: string;

  /** Optional, unless the account is verified by SMS (`otpChannel === SMS`). */
  @IsOptional()
  @IsPhoneNumber('BD')
  phone?: string;

  /** Which identifier the OTP was sent to (via POST /auth/otp/send): the email, or the phone. */
  @IsEnum(OtpChannel)
  otpChannel!: OtpChannel;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits' })
  otpCode!: string;

  /** Every registrant becomes an Innovation Submitter; this layers on one additional self-service role at signup. */
  @IsOptional()
  @IsIn(SELF_SERVICE_ROLES)
  role?: (typeof SELF_SERVICE_ROLES)[number];

  // Investor-only fields (role === INVESTOR)
  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  binNumber?: string;

  @IsOptional()
  @IsArray()
  sectorInterestIds?: string[];

  // Mentor-only fields (role === MENTOR)
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsArray()
  expertiseTagIds?: string[];

  // Ministry Focal Point-only fields (role === MINISTRY_FOCAL_POINT)
  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

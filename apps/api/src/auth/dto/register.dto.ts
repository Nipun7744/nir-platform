import { IsArray, IsEmail, IsIn, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

const SELF_SERVICE_ROLES = [Role.INVESTOR, Role.MENTOR, Role.MINISTRY_FOCAL_POINT] as const;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsPhoneNumber('BD')
  phone?: string;

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

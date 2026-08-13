import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { SessionMode, SessionStatus } from '@prisma/client';

export class RegisterMentorDto {
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() availability?: string;
  @IsOptional() @IsArray() expertiseTagIds?: string[];
}

export class CreateMentorMatchDto {
  @IsString() mentorId!: string;
  @IsString() innovationId!: string;
}

export class ProposeSessionDto {
  @IsString() mentorId!: string;
  @IsString() innovatorUserId!: string;
  @IsOptional() @IsString() innovationId?: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsEnum(SessionMode) mode?: SessionMode;
}

export class UpdateSessionStatusDto {
  @IsEnum(SessionStatus) status!: SessionStatus;
}

export class SubmitMentorFeedbackDto {
  @IsString() feedback!: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
}

export class LogMentorActivityDto {
  @IsPositive() hours!: number;
  @IsOptional() @IsString() description?: string;
}

import { MessageChannel, OtpChannel, BulkRecipientStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { LIMITS } from '../message-template';

export class ParticipantListDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class ExportDto {
  /** Language of the column headers / labels in the workbook. Data is exported as stored. */
  @IsOptional()
  @IsIn(['en', 'bn'])
  lang?: 'en' | 'bn';
}

/** The message as composed — shared by preview and send. */
export class ComposeMessageDto {
  @IsString()
  @MinLength(1)
  challengeId!: string;

  @IsEnum(MessageChannel)
  channel!: MessageChannel;

  /** Required for EMAIL, ignored for SMS. */
  @ValidateIf((o: ComposeMessageDto) => o.channel === MessageChannel.EMAIL)
  @IsString()
  @MinLength(1, { message: 'Enter a subject' })
  @MaxLength(LIMITS.subjectMax)
  subject?: string;

  @IsString()
  @MinLength(1, { message: 'Enter a message' })
  @MaxLength(LIMITS.emailBodyMax)
  body!: string;
}

export class SendOtpForBulkDto {
  /** Where the admin receives the confirmation code: their own account email or mobile. */
  @IsOptional()
  @IsEnum(OtpChannel)
  otpChannel?: OtpChannel;

  @IsOptional()
  @IsIn(['en', 'bn'])
  locale?: 'en' | 'bn';
}

export class SendBulkMessageDto extends ComposeMessageDto {
  @IsEnum(OtpChannel)
  otpChannel!: OtpChannel;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits' })
  otpCode!: string;

  /** Generated once per composition by the client (UUID); replays return the same send. */
  @IsString()
  @Matches(/^[A-Za-z0-9-]{16,64}$/, { message: 'requestKey must be 16-64 letters, digits or dashes' })
  requestKey!: string;

  /** Explicitly send even though the same message already went to this challenge in the last 24 h. */
  @IsOptional()
  @IsBoolean()
  allowRepeat?: boolean;
}

export class HistoryDto {
  @IsOptional()
  @IsString()
  challengeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class RecipientListDto {
  @IsOptional()
  @IsEnum(BulkRecipientStatus)
  status?: BulkRecipientStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

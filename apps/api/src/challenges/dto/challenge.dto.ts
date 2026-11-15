import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ChallengeStatus, ReviewStatus } from '@prisma/client';
import { FIELD_MAPPINGS, FORM_FIELD_TYPES, MAX_FIELDS } from '../challenge-rules';

// ---------------------------------------------------------------- details-page sections (2026-11-11)

// The optional *Bn keys (2026-11-15) are the Bangla text; the site falls back to English if blank.
export class TimelinePhaseDto {
  @IsString() @IsNotEmpty() @MaxLength(120) label!: string;
  @IsOptional() @IsString() @MaxLength(120) labelBn?: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(500) descriptionBn?: string;
}

export class ChallengeFaqDto {
  @IsString() @IsNotEmpty() @MaxLength(300) question!: string;
  @IsOptional() @IsString() @MaxLength(300) questionBn?: string;
  @IsString() @IsNotEmpty() @MaxLength(3000) answer!: string;
  @IsOptional() @IsString() @MaxLength(3000) answerBn?: string;
}

export class ChallengeResourceDto {
  @IsString() @IsNotEmpty() @MaxLength(200) label!: string;
  @IsOptional() @IsString() @MaxLength(200) labelBn?: string;
  // Web links or our own uploads only — never javascript:/data: URLs, since this lands in an href.
  @IsString()
  @MaxLength(500)
  @Matches(/^(https?:\/\/|\/uploads\/)/i, { message: 'Resource URL must start with http(s):// or /uploads/' })
  url!: string;
}

const LONG_TEXT = 10000;

/** Details-page fields shared by create and update — all optional; '' clears a value. */
class ChallengeDetailsDto {
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) problemStatementEn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) problemStatementBn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) eligibilityEn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) eligibilityBn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) evaluationCriteriaEn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) evaluationCriteriaBn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) prizeDetailsEn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) prizeDetailsBn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) additionalInfoEn?: string;
  @IsOptional() @IsString() @MaxLength(LONG_TEXT) additionalInfoBn?: string;
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;
  @IsOptional() @IsString() @MaxLength(300) organizingAgencyBn?: string;
  @IsOptional() @IsString() @MaxLength(300) prizeInfoBn?: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => TimelinePhaseDto)
  timelinePhases?: TimelinePhaseDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ChallengeFaqDto)
  faqs?: ChallengeFaqDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ChallengeResourceDto)
  resources?: ChallengeResourceDto[];
}

export class CreateChallengeDto extends ChallengeDetailsDto {
  @IsString() @IsNotEmpty() slug!: string;
  @IsString() @IsNotEmpty() titleEn!: string;
  @IsOptional() @IsString() titleBn?: string;
  @IsString() @IsNotEmpty() organizingAgency!: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsString() @IsNotEmpty() descriptionEn!: string;
  @IsOptional() @IsString() descriptionBn?: string;
  @IsOptional() @IsEnum(ChallengeStatus) status?: ChallengeStatus;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() submissionsEnabled?: boolean;
  // '' clears an optional date / string from the admin edit form.
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsDateString() startDate?: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsDateString() deadline?: string;
  @IsOptional() @IsString() bannerImageUrl?: string;
  @IsOptional() @IsString() prizeInfoEn?: string;
  @IsOptional() @IsString() applyUrl?: string;
}

/**
 * Hand-written (not `Partial<CreateChallengeDto>`) — a bare Partial<> type erases to Object at
 * runtime and the global ValidationPipe silently skips it. See UpdateNewsDto for the same note.
 */
export class UpdateChallengeDto extends ChallengeDetailsDto {
  @IsOptional() @IsString() @IsNotEmpty() slug?: string;
  @IsOptional() @IsString() @IsNotEmpty() titleEn?: string;
  @IsOptional() @IsString() titleBn?: string;
  @IsOptional() @IsString() @IsNotEmpty() organizingAgency?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @IsNotEmpty() descriptionEn?: string;
  @IsOptional() @IsString() descriptionBn?: string;
  @IsOptional() @IsEnum(ChallengeStatus) status?: ChallengeStatus;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() submissionsEnabled?: boolean;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsDateString() startDate?: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsDateString() deadline?: string;
  @IsOptional() @IsString() bannerImageUrl?: string;
  @IsOptional() @IsString() prizeInfoEn?: string;
  @IsOptional() @IsString() applyUrl?: string;
}

export class FormFieldDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() @MaxLength(60) key?: string;
  @IsString() @MaxLength(200) label!: string;
  @IsOptional() @IsString() @MaxLength(200) labelBn?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) descriptionBn?: string | null;
  @IsIn(FORM_FIELD_TYPES as unknown as string[]) type!: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsString() @MaxLength(200) placeholder?: string | null;
  @IsOptional() @IsString() @MaxLength(200) placeholderBn?: string | null;
  @IsOptional() @IsString() @MaxLength(500) helpText?: string | null;
  @IsOptional() @IsString() @MaxLength(500) helpTextBn?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(200, { each: true }) options?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(200, { each: true }) optionsBn?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) acceptedFileTypes?: string[];
  @IsOptional() @IsInt() maxFileSizeMb?: number | null;
  @IsOptional() @IsInt() maxFiles?: number | null;
  @IsOptional() @IsIn([...FIELD_MAPPINGS, null]) mapsTo?: string | null;
}

export class SaveFormDto {
  @IsArray()
  @ArrayMaxSize(MAX_FIELDS)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields!: FormFieldDto[];
}

export class SubmitChallengeDto {
  /** Answers keyed by form field `key`. Validated against the challenge's form in the service. */
  @IsObject() responses!: Record<string, unknown>;
}

export class SubmissionFilterDto {
  @IsOptional() @IsIn(['GENERAL', 'CHALLENGE']) channel?: 'GENERAL' | 'CHALLENGE';
  @IsOptional() @IsString() challengeId?: string;
  @IsOptional() @IsEnum(ReviewStatus) reviewStatus?: ReviewStatus;
  /** Matches submitter name/email, innovation title or code. */
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  // String, not boolean: implicit conversion would turn the query string "false" into true.
  @IsOptional() @IsIn(['true', 'false']) includeDrafts?: 'true' | 'false';
  @IsOptional() @IsInt() page?: number;
  @IsOptional() @IsInt() pageSize?: number;
}

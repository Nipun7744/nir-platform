import { IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ChallengeStatus, ResourceType } from '@prisma/client';

export class CreateFaqDto {
  @IsString() categoryLabel!: string;
  @IsString() questionEn!: string;
  @IsOptional() @IsString() questionBn?: string;
  @IsString() answerEn!: string;
  @IsOptional() @IsString() answerBn?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class CreateNewsDto {
  @IsString() slug!: string;
  @IsString() titleEn!: string;
  @IsOptional() @IsString() titleBn?: string;
  @IsString() bodyEn!: string;
  @IsOptional() @IsString() bodyBn?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsDateString() eventDate?: string;
  @IsOptional() @IsString() category?: string;
}

export class CreateChallengeDto {
  @IsString() slug!: string;
  @IsString() titleEn!: string;
  @IsOptional() @IsString() titleBn?: string;
  @IsString() organizingAgency!: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsString() descriptionEn!: string;
  @IsOptional() @IsString() descriptionBn?: string;
  @IsOptional() @IsEnum(ChallengeStatus) status?: ChallengeStatus;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() deadline?: string;
  @IsOptional() @IsString() bannerImageUrl?: string;
  @IsOptional() @IsString() prizeInfoEn?: string;
  @IsOptional() @IsString() applyUrl?: string;
}

export class CreateResourceDto {
  @IsString() titleEn!: string;
  @IsOptional() @IsString() titleBn?: string;
  @IsEnum(ResourceType) type!: ResourceType;
  @IsOptional() @IsString() descriptionEn?: string;
  @IsString() fileUrl!: string;
  @IsString() fileType!: string;
  @IsInt() fileSizeBytes!: number;
}

export class CreatePartnerDto {
  @IsString() name!: string;
  @IsString() logoUrl!: string;
  @IsOptional() @IsString() websiteUrl?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class CreateFeedbackDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() subject!: string;
  @IsString() message!: string;
}

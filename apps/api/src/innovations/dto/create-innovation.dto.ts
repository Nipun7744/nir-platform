import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FundingSource, InnovationType, IpStatus, Locale } from '@prisma/client';

export class CreateInnovationDto {
  @IsString() @IsNotEmpty()
  titleEn!: string;

  @IsOptional() @IsString()
  titleBn?: string;

  @IsString() @IsNotEmpty()
  summaryEn!: string;

  @IsOptional() @IsString()
  summaryBn?: string;

  @IsString() @IsNotEmpty()
  problemStatement!: string;

  @IsString() @IsNotEmpty()
  proposedSolution!: string;

  @IsOptional() @IsString()
  objectives?: string;

  @IsOptional() @IsString()
  keyFeatures?: string;

  @IsOptional() @IsString()
  targetBeneficiaries?: string;

  @IsOptional() @IsString()
  impact?: string;

  @IsOptional() @IsInt() @Min(1) @Max(9)
  technologyReadinessLevel?: number;

  @IsEnum(InnovationType)
  innovationType!: InnovationType;

  @IsOptional() @IsEnum(IpStatus)
  ipStatus?: IpStatus;

  @IsOptional() @IsEnum(FundingSource)
  fundingSource?: FundingSource;

  @IsOptional() @IsString()
  commercializationStatus?: string;

  @IsOptional() @IsString()
  replicationPotential?: string;

  @IsOptional() @IsBoolean()
  mentorshipNeeded?: boolean;

  @IsOptional() @IsBoolean()
  fundingNeeded?: boolean;

  @IsOptional() @IsBoolean()
  recognitionNeeded?: boolean;

  @IsString() @IsNotEmpty()
  categoryId!: string;

  @IsOptional() @IsString()
  regionId?: string;

  @IsOptional() @IsString()
  organizationId?: string;

  @IsOptional() @IsLatitude()
  latitude?: number;

  @IsOptional() @IsLongitude()
  longitude?: number;

  @IsOptional() @IsEnum(Locale)
  languageOriginal?: Locale;

  @IsOptional()
  tagIds?: string[];

  @IsOptional()
  sdgTagIds?: string[];

  @IsOptional() @IsString()
  ministryId?: string;

  @IsOptional() @IsString()
  ministryCycleId?: string;
}

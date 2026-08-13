import { IsArray, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { EoiStatus, FundingSource } from '@prisma/client';

export class RegisterInvestorDto {
  @IsString() organizationName!: string;
  @IsOptional() @IsString() binNumber?: string;
  @IsOptional() @IsArray() sectorInterestIds?: string[];
}

export class CreateEoiDto {
  @IsString() innovationId!: string;
  @IsOptional() @IsString() message?: string;
}

export class CreateReferralDto {
  @IsString() innovationId!: string;
  @IsString() investorId!: string;
  @IsOptional() @IsString() message?: string;
}

export class UpdateEoiStatusDto {
  @IsEnum(EoiStatus) status!: EoiStatus;
}

export class CreateFundingAgreementDto {
  @IsString() innovationId!: string;
  @IsOptional() @IsString() investorId?: string;
  @IsString() title!: string;
  @IsString() documentUrl!: string;
  @IsOptional() signedDate?: string;
}

export class CreateFundDisbursementDto {
  @IsString() innovationId!: string;
  @IsNumber() @IsPositive() amount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsEnum(FundingSource) source!: FundingSource;
  @IsString() disbursedAt!: string;
  @IsOptional() @IsString() note?: string;
}

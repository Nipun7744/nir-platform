import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DevelopmentStage, FundingSource, InnovationType, OrganizationType } from '@prisma/client';

export enum SortOption {
  NEWEST = 'newest',
  POPULAR = 'popular',
  ALPHABETICAL = 'az',
}

export class SearchInnovationsDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsEnum(DevelopmentStage) developmentStage?: DevelopmentStage;
  @IsOptional() @IsEnum(InnovationType) innovationType?: InnovationType;
  @IsOptional() @IsEnum(OrganizationType) organizationType?: OrganizationType;
  @IsOptional() @IsEnum(FundingSource) fundingSource?: FundingSource;
  @IsOptional() @IsString() regionId?: string;
  @IsOptional() @IsString() sdgTagId?: string;
  @IsOptional() @IsString() tagId?: string;
  @IsOptional() @IsEnum(SortOption) sort?: SortOption;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48)
  pageSize?: number = 12;
}

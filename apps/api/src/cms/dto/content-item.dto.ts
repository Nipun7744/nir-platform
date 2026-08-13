import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContentStatus, ContentType } from '@prisma/client';

export class CreateContentItemDto {
  @IsEnum(ContentType) type!: ContentType;
  @IsString() slug!: string;
  @IsString() titleEn!: string;
  @IsOptional() @IsString() titleBn?: string;
  @IsOptional() @IsString() bodyEn?: string;
  @IsOptional() @IsString() bodyBn?: string;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}

export class UpdateContentItemDto {
  @IsOptional() @IsString() titleEn?: string;
  @IsOptional() @IsString() titleBn?: string;
  @IsOptional() @IsString() bodyEn?: string;
  @IsOptional() @IsString() bodyBn?: string;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}

export class UpdateContentStatusDto {
  @IsEnum(ContentStatus) status!: ContentStatus;
}

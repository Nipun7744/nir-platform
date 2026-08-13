import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { TagType, RegionType } from '@prisma/client';

export class CreateTagDto {
  @IsEnum(TagType) type!: TagType;
  @IsString() nameEn!: string;
  @IsString() nameBn!: string;
}

export class CreateSdgTagDto {
  @IsInt() code!: number;
  @IsString() nameEn!: string;
  @IsString() nameBn!: string;
}

export class CreateRegionDto {
  @IsEnum(RegionType) type!: RegionType;
  @IsString() nameEn!: string;
  @IsString() nameBn!: string;
  @IsOptional() @IsString() parentId?: string;
}

export class CreateMinistryDto {
  @IsString() code!: string;
  @IsString() nameEn!: string;
  @IsString() nameBn!: string;
}

export class ToggleActiveDto {
  @IsBoolean() isActive!: boolean;
}

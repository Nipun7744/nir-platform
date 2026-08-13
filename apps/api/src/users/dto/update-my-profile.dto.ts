import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional() @IsString() @MaxLength(120)
  fullName?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(150)
  designation?: string;

  @IsOptional() @IsString() @MaxLength(150)
  institution?: string;

  @IsOptional() @IsString() @MaxLength(500)
  avatarUrl?: string;

  /** Only applied when the requesting user has the Expert Evaluator role. */
  @IsOptional() @IsArray()
  categoryIds?: string[];
}

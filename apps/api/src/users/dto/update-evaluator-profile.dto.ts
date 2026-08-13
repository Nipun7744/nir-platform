import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateEvaluatorProfileDto {
  @IsOptional() @IsString()
  designation?: string;

  @IsOptional() @IsString()
  institution?: string;

  @IsOptional() @IsArray()
  categoryIds?: string[];
}

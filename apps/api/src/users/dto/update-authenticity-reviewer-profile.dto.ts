import { IsArray, IsOptional } from 'class-validator';

export class UpdateAuthenticityReviewerProfileDto {
  @IsOptional() @IsArray()
  categoryIds?: string[];
}

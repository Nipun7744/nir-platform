import { IsArray, IsOptional } from 'class-validator';

export class UpdatePreliminaryReviewerProfileDto {
  @IsOptional() @IsArray()
  categoryIds?: string[];
}

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(ReviewStatus)
  reviewStatus!: ReviewStatus;

  @IsOptional() @IsString()
  note?: string;
}

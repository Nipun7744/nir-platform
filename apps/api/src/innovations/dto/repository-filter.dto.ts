import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RepositoryFilterDto {
  @IsOptional() @IsIn(['APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'])
  status?: 'APPROVED' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() fromDate?: string;
  @IsOptional() @IsString() toDate?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number = 20;
}

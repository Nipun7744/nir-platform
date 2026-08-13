import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class RegisterFocalPointDto {
  @IsString() ministryId!: string;
  @IsOptional() @IsString() title?: string;
}

export class CreateCycleDto {
  @IsInt() year!: number;
  @IsDateString() opensAt!: string;
  @IsDateString() closesAt!: string;
}

export class CreateSubmissionDto {
  @IsString() cycleId!: string;
}

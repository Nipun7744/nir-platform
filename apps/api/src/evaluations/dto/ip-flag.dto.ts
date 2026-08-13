import { IsOptional, IsString } from 'class-validator';

export class IpFlagDto {
  @IsString()
  innovationId!: string;

  @IsOptional() @IsString()
  note?: string;
}

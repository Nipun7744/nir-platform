import { IsOptional, IsString } from 'class-validator';

export class AssignPanelDto {
  @IsString()
  innovationId!: string;

  @IsString()
  evaluatorId!: string;

  @IsOptional() @IsString()
  expertDomainTagId?: string;
}

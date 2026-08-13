import { IsOptional, IsString } from 'class-validator';

export class AddTeamMemberDto {
  @IsString()
  displayName!: string;

  @IsOptional() @IsString()
  roleInTeam?: string;

  @IsOptional() @IsString()
  innovatorId?: string;
}

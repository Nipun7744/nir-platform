import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateApprovalDto {
  @IsOptional() @IsBoolean()
  recognitionApproved?: boolean;

  @IsOptional() @IsString()
  recognitionApprovalComment?: string;

  @IsOptional() @IsBoolean()
  mentorApproved?: boolean;

  @IsOptional() @IsString()
  mentorApprovalComment?: string;

  @IsOptional() @IsBoolean()
  fundApproved?: boolean;

  @IsOptional() @IsString()
  fundApprovalComment?: string;

  @IsOptional() @IsString()
  approvalLetterUrl?: string;

  // Set only by the Admin Evaluations detail page's explicit "Save approval decisions" click —
  // never by the incidental approval-letter-upload save, which reuses this same endpoint. See
  // InnovationsService.updateApproval.
  @IsOptional() @IsBoolean()
  finalize?: boolean;
}

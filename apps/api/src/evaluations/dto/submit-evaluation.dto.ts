import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { EvaluationRecommendation } from '@prisma/client';

export class SubmitEvaluationDto {
  @IsString()
  innovationId!: string;

  @IsObject() @IsNotEmpty()
  scores!: Record<string, number>;

  @IsOptional() @IsString()
  comments?: string;

  // Required, not optional: the Expert Evaluator's decision (SHORTLIST/REJECT) is what drives the
  // innovation's status transition below — see EvaluationsService.submitEvaluation.
  @IsEnum(EvaluationRecommendation)
  recommendation!: EvaluationRecommendation;

  @IsOptional() @IsBoolean()
  isBlind?: boolean;
}

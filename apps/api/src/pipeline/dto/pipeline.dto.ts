import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PipelineStage } from '@prisma/client';

export class AddPipelineNoteDto {
  @IsString() innovationId!: string;
  @IsString() note!: string;
  @IsOptional() @IsString() attachmentUrl?: string;
}

export class UpdatePipelineStageDto {
  @IsEnum(PipelineStage) pipelineStage!: PipelineStage;
}

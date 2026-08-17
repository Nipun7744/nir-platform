import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttachmentKind } from '@prisma/client';

export class ReplaceAttachmentDto {
  @IsString()
  url!: string;

  @IsOptional() @IsEnum(AttachmentKind)
  kind?: AttachmentKind;

  @IsOptional() @IsString()
  caption?: string;

  @IsOptional() @IsString()
  mimeType?: string;

  @IsOptional()
  sizeBytes?: number;
}

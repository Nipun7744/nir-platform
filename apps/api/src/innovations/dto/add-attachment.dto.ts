import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttachmentKind } from '@prisma/client';

export class AddAttachmentDto {
  @IsEnum(AttachmentKind)
  kind!: AttachmentKind;

  @IsString()
  url!: string;

  @IsOptional() @IsString()
  caption?: string;

  @IsOptional() @IsString()
  mimeType?: string;

  @IsOptional()
  sizeBytes?: number;
}

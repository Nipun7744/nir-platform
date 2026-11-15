import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { UPLOAD_MAX_SIZE_BYTES } from './upload-limits';

// ToR §7.1 — secure, tamper-proof uploads: restrict by type/size; filenames are
// server-generated (never trust the client-supplied name). Virus scanning is a
// hosting-layer control (ClamAV or equivalent at the NDC) out of this app's scope.
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
]);

/**
 * Multer (busboy) decodes multipart filenames as latin1, so a UTF-8 name such as a Bangla one
 * arrives as mojibake ("à¦ªà§...pdf"). Re-decode as UTF-8, keeping the original when the bytes
 * weren't valid UTF-8 (a genuine latin1 name). Also strips any path a browser may send.
 */
export function readableOriginalName(raw: string): string {
  const decoded = Buffer.from(raw, 'latin1').toString('utf8');
  const name = decoded.includes('�') ? raw : decoded;
  return name.split(/[\\/]/).pop()!.trim() || 'file';
}

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR ?? './uploads',
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: UPLOAD_MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        // Runs before storage, so the stored extension and the returned originalName both use it.
        file.originalname = readableOriginalName(file.originalname);
        if (!ALLOWED_MIME.has(file.mimetype)) {
          return cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return {
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }
}

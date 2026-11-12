/**
 * Upload size ceiling shared by POST /uploads (multer limit) and the challenge form rules (a form
 * field may not allow more than this). Kept free of Nest/Prisma imports so challenge-rules.ts stays
 * a pure, directly unit-testable module.
 */
export const UPLOAD_MAX_SIZE_MB = 50;
export const UPLOAD_MAX_SIZE_BYTES = UPLOAD_MAX_SIZE_MB * 1024 * 1024;

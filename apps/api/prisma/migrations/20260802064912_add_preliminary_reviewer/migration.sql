-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PRELIMINARY_REVIEWER';

-- AlterTable
ALTER TABLE "Innovation" ADD COLUMN     "reviewRemarks" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preliminaryReviewerCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

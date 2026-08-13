-- AlterEnum
ALTER TYPE "ReviewStatus" ADD VALUE 'DUE_DILIGENCE';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DUE_DILIGENCE_REVIEWER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dueDiligenceReviewerCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

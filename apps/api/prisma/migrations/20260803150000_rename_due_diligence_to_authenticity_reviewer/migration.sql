-- Rename the "Due Diligence" role/stage to "Authenticity Reviewer" throughout.
-- Uses RENAME VALUE / RENAME COLUMN (not drop+recreate) so existing rows keep their data.

-- AlterEnum
ALTER TYPE "Role" RENAME VALUE 'DUE_DILIGENCE_REVIEWER' TO 'AUTHENTICITY_REVIEWER';

-- AlterEnum
ALTER TYPE "ReviewStatus" RENAME VALUE 'DUE_DILIGENCE' TO 'AUTHENTICITY_REVIEW';

-- AlterEnum
ALTER TYPE "ReviewStage" RENAME VALUE 'DUE_DILIGENCE' TO 'AUTHENTICITY_REVIEW';

-- AlterTable
ALTER TABLE "User" RENAME COLUMN "dueDiligenceReviewerCategoryIds" TO "authenticityReviewerCategoryIds";

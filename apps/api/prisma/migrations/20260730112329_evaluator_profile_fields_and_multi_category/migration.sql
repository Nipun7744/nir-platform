-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_evaluatorCategoryId_fkey";

-- DropIndex
DROP INDEX "User_evaluatorCategoryId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "evaluatorCategoryId",
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "evaluatorCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "institution" TEXT;


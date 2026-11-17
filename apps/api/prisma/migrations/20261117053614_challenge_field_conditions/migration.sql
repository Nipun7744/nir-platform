-- AlterTable
ALTER TABLE "ChallengeFormField" ADD COLUMN     "showIfFieldKey" TEXT,
ADD COLUMN     "showIfValues" TEXT[] DEFAULT ARRAY[]::TEXT[];

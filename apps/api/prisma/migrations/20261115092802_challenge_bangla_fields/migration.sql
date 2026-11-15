-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "organizingAgencyBn" TEXT,
ADD COLUMN     "prizeInfoBn" TEXT;

-- AlterTable
ALTER TABLE "ChallengeFormField" ADD COLUMN     "descriptionBn" TEXT,
ADD COLUMN     "helpTextBn" TEXT,
ADD COLUMN     "labelBn" TEXT,
ADD COLUMN     "optionsBn" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "placeholderBn" TEXT;

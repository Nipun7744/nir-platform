-- CreateEnum
CREATE TYPE "SubmissionChannel" AS ENUM ('GENERAL', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'SELECT', 'RADIO', 'CHECKBOX', 'DATE', 'FILE', 'MULTI_FILE');

-- CreateEnum
CREATE TYPE "InnovationFieldMapping" AS ENUM ('TITLE', 'SUMMARY', 'PROBLEM_STATEMENT', 'PROPOSED_SOLUTION');

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "submissionsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Innovation" ADD COLUMN     "challengeId" TEXT,
ADD COLUMN     "challengeResponses" JSONB,
ADD COLUMN     "submissionChannel" "SubmissionChannel" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "ChallengeFormField" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "FormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "helpText" TEXT,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acceptedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxFileSizeMb" INTEGER,
    "maxFiles" INTEGER,
    "mapsTo" "InnovationFieldMapping",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ChallengeFormField_challengeId_sortOrder_idx" ON "ChallengeFormField"("challengeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeFormField_challengeId_key_key" ON "ChallengeFormField"("challengeId", "key");

-- CreateIndex
CREATE INDEX "Innovation_challengeId_idx" ON "Innovation"("challengeId");

-- CreateIndex
CREATE INDEX "Innovation_submissionChannel_idx" ON "Innovation"("submissionChannel");

-- AddForeignKey
ALTER TABLE "Innovation" ADD CONSTRAINT "Innovation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeFormField" ADD CONSTRAINT "ChallengeFormField_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

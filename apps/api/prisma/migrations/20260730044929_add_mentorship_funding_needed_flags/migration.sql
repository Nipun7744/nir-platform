-- AlterTable
ALTER TABLE "Innovation" ADD COLUMN     "fundingNeeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentorshipNeeded" BOOLEAN NOT NULL DEFAULT false;

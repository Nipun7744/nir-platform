-- AlterTable
ALTER TABLE "Innovation" ADD COLUMN     "approvalLetterUrl" TEXT,
ADD COLUMN     "fundApprovalComment" TEXT,
ADD COLUMN     "fundApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentorApprovalComment" TEXT,
ADD COLUMN     "mentorApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recognitionApprovalComment" TEXT,
ADD COLUMN     "recognitionApproved" BOOLEAN NOT NULL DEFAULT false;

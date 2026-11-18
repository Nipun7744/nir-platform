-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "BulkMessageStatus" AS ENUM ('QUEUED', 'SENDING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "BulkRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'BULK_MESSAGE_CONFIRM';

-- CreateTable
CREATE TABLE "BulkMessage" (
    "id" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "challengeId" TEXT,
    "challengeTitleEn" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "status" "BulkMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BulkMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkMessageRecipient" (
    "id" TEXT NOT NULL,
    "bulkMessageId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "BulkRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "BulkMessageRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BulkMessage_requestKey_key" ON "BulkMessage"("requestKey");

-- CreateIndex
CREATE INDEX "BulkMessage_challengeId_channel_createdAt_idx" ON "BulkMessage"("challengeId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "BulkMessage_status_idx" ON "BulkMessage"("status");

-- CreateIndex
CREATE INDEX "BulkMessage_createdAt_idx" ON "BulkMessage"("createdAt");

-- CreateIndex
CREATE INDEX "BulkMessageRecipient_bulkMessageId_status_idx" ON "BulkMessageRecipient"("bulkMessageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BulkMessageRecipient_bulkMessageId_userId_key" ON "BulkMessageRecipient"("bulkMessageId", "userId");

-- AddForeignKey
ALTER TABLE "BulkMessage" ADD CONSTRAINT "BulkMessage_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessage" ADD CONSTRAINT "BulkMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessageRecipient" ADD CONSTRAINT "BulkMessageRecipient_bulkMessageId_fkey" FOREIGN KEY ("bulkMessageId") REFERENCES "BulkMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

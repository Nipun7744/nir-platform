-- CreateEnum
CREATE TYPE "Role" AS ENUM ('INNOVATION_SUBMITTER', 'INSTITUTIONAL_COORDINATOR', 'EXPERT_EVALUATOR', 'INVESTOR', 'STAKEHOLDER_PARTNER', 'PLATFORM_ADMIN', 'SYSTEM_ADMIN', 'PUBLIC_VIEWER', 'POLICY_OBSERVER', 'INNOVATION_MANAGER', 'MINISTRY_FOCAL_POINT', 'MENTOR');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DevelopmentStage" AS ENUM ('IDEA', 'PROTOTYPE_DEVELOPED', 'PILOT_IMPLEMENTED', 'COMMERCIALIZED', 'SCALED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('INTAKE', 'UNDER_ASSESSMENT', 'ADVISORY_SUPPORT', 'FUNDED', 'SCALING', 'CLOSED');

-- CreateEnum
CREATE TYPE "InnovationType" AS ENUM ('PRODUCT', 'PROCESS', 'SERVICE', 'DIGITAL_SOLUTION', 'TECHNOLOGY', 'POLICY_INNOVATION', 'RESEARCH_OUTPUT');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('GOVERNMENT', 'UNIVERSITY', 'STARTUP', 'PRIVATE_SECTOR', 'NGO', 'RESEARCH_INSTITUTE', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "FundingSource" AS ENUM ('A2I_INNOVATION_FUND', 'GOVERNMENT', 'DEVELOPMENT_PARTNER', 'PRIVATE_INVESTMENT', 'SELF_FUNDED');

-- CreateEnum
CREATE TYPE "IpStatus" AS ENUM ('NONE', 'PATENTED', 'PATENT_PENDING', 'UNDER_PROCESSING');

-- CreateEnum
CREATE TYPE "EvaluationRecommendation" AS ENUM ('REJECT', 'SHORTLIST', 'FUND');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('PAGE', 'ANNOUNCEMENT', 'BLOG_POST', 'FAQ', 'NOTIFICATION_TEMPLATE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EoiStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'IN_DISCUSSION', 'AGREEMENT_SIGNED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('UPCOMING', 'OPEN', 'CLOSED', 'EVALUATING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT', 'PUBLICATION', 'PATENT');

-- CreateEnum
CREATE TYPE "RegionType" AS ENUM ('DIVISION', 'DISTRICT');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('THEMATIC', 'TECHNOLOGY');

-- CreateEnum
CREATE TYPE "MinistrySubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('GUIDELINE', 'POLICY', 'SOP', 'MANUAL', 'TEMPLATE', 'REPORT', 'TOOLKIT');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'bn');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "roles" "Role"[] DEFAULT ARRAY['PUBLIC_VIEWER']::"Role"[],
    "fullName" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionBn" TEXT,
    "examplesEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SdgTag" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SdgTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "type" "TagType" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "type" "RegionType" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ministry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ministry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "regionId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Innovator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "irn" TEXT NOT NULL,
    "organizationId" TEXT,
    "nidVerified" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Innovator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Innovation" (
    "id" TEXT NOT NULL,
    "innovationCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT,
    "summaryEn" TEXT NOT NULL,
    "summaryBn" TEXT,
    "problemStatement" TEXT NOT NULL,
    "proposedSolution" TEXT NOT NULL,
    "objectives" TEXT,
    "keyFeatures" TEXT,
    "targetBeneficiaries" TEXT,
    "impact" TEXT,
    "technologyReadinessLevel" INTEGER,
    "innovationType" "InnovationType" NOT NULL,
    "developmentStage" "DevelopmentStage" NOT NULL DEFAULT 'IDEA',
    "ipStatus" "IpStatus" NOT NULL DEFAULT 'NONE',
    "fundingSource" "FundingSource",
    "commercializationStatus" TEXT,
    "replicationPotential" TEXT,
    "categoryId" TEXT NOT NULL,
    "regionId" TEXT,
    "organizationId" TEXT,
    "submittedById" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "ministryId" TEXT,
    "ministryCycleId" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'INTAKE',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "languageOriginal" "Locale" NOT NULL DEFAULT 'en',
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Innovation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InnovationTeamMember" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "innovatorId" TEXT,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "roleInTeam" TEXT NOT NULL DEFAULT 'Team Member',

    CONSTRAINT "InnovationTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InnovationAttachment" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InnovationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InnovationTag" (
    "innovationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "InnovationTag_pkey" PRIMARY KEY ("innovationId","tagId")
);

-- CreateTable
CREATE TABLE "InnovationSdgTag" (
    "innovationId" TEXT NOT NULL,
    "sdgTagId" TEXT NOT NULL,

    CONSTRAINT "InnovationSdgTag_pkey" PRIMARY KEY ("innovationId","sdgTagId")
);

-- CreateTable
CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT,
    "bodyEn" TEXT NOT NULL,
    "bodyBn" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuccessStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grantedBy" TEXT,
    "year" INTEGER,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationPanelAssignment" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "expertDomainTagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationPanelAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "totalScore" DOUBLE PRECISION,
    "comments" TEXT,
    "recommendation" "EvaluationRecommendation",
    "isBlind" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpAdvisoryFlag" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "flaggedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpAdvisoryFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "binNumber" TEXT,
    "binVerified" BOOLEAN NOT NULL DEFAULT false,
    "sectorInterestIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpressionOfInterest" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "message" TEXT,
    "status" "EoiStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpressionOfInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingAgreement" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "investorId" TEXT,
    "title" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "signedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundDisbursement" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "source" "FundingSource" NOT NULL,
    "disbursedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "queryJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT,
    "bodyEn" TEXT,
    "bodyBn" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subjectEn" TEXT,
    "subjectBn" TEXT,
    "bodyEn" TEXT NOT NULL,
    "bodyBn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "templateCode" TEXT NOT NULL,
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "altTextEn" TEXT,
    "altTextBn" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionBn" TEXT,
    "answerEn" TEXT NOT NULL,
    "answerBn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackGrievance" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackGrievance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT,
    "bodyEn" TEXT NOT NULL,
    "bodyBn" TEXT,
    "coverImageUrl" TEXT,
    "eventDate" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "category" TEXT NOT NULL DEFAULT 'Evaluation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceDocument" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT,
    "type" "ResourceType" NOT NULL,
    "descriptionEn" TEXT,
    "descriptionBn" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT,
    "organizingAgency" TEXT NOT NULL,
    "categoryId" TEXT,
    "descriptionEn" TEXT NOT NULL,
    "descriptionBn" TEXT,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'UPCOMING',
    "deadline" TIMESTAMP(3),
    "prizeInfoEn" TEXT,
    "applyUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertiseTagIds" TEXT[],
    "bio" TEXT,
    "availability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMatch" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorSession" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "innovatorUserId" TEXT NOT NULL,
    "innovationId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "mode" "SessionMode" NOT NULL DEFAULT 'ONLINE',
    "status" "SessionStatus" NOT NULL DEFAULT 'PROPOSED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorFeedback" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorActivityLog" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineNote" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistryFocalPoint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinistryFocalPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistrySubmissionCycle" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinistrySubmissionCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistrySubmission" (
    "id" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" "MinistrySubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinistrySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistryAnnualReport" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "stats" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinistryAnnualReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SdgTag_code_key" ON "SdgTag"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_type_nameEn_key" ON "Tag"("type", "nameEn");

-- CreateIndex
CREATE INDEX "Region_parentId_idx" ON "Region"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_code_key" ON "Ministry"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Innovator_userId_key" ON "Innovator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Innovator_irn_key" ON "Innovator"("irn");

-- CreateIndex
CREATE UNIQUE INDEX "Innovation_innovationCode_key" ON "Innovation"("innovationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Innovation_slug_key" ON "Innovation"("slug");

-- CreateIndex
CREATE INDEX "Innovation_categoryId_idx" ON "Innovation"("categoryId");

-- CreateIndex
CREATE INDEX "Innovation_reviewStatus_idx" ON "Innovation"("reviewStatus");

-- CreateIndex
CREATE INDEX "Innovation_developmentStage_idx" ON "Innovation"("developmentStage");

-- CreateIndex
CREATE INDEX "Innovation_regionId_idx" ON "Innovation"("regionId");

-- CreateIndex
CREATE INDEX "Innovation_ministryId_idx" ON "Innovation"("ministryId");

-- CreateIndex
CREATE INDEX "Innovation_slug_idx" ON "Innovation"("slug");

-- CreateIndex
CREATE INDEX "InnovationTeamMember_innovationId_idx" ON "InnovationTeamMember"("innovationId");

-- CreateIndex
CREATE INDEX "InnovationAttachment_innovationId_idx" ON "InnovationAttachment"("innovationId");

-- CreateIndex
CREATE UNIQUE INDEX "SuccessStory_innovationId_key" ON "SuccessStory"("innovationId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationPanelAssignment_innovationId_evaluatorId_key" ON "EvaluationPanelAssignment"("innovationId", "evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_innovationId_evaluatorId_key" ON "Evaluation"("innovationId", "evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_userId_key" ON "Investor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_binNumber_key" ON "Investor"("binNumber");

-- CreateIndex
CREATE INDEX "ExpressionOfInterest_innovationId_idx" ON "ExpressionOfInterest"("innovationId");

-- CreateIndex
CREATE INDEX "ExpressionOfInterest_investorId_idx" ON "ExpressionOfInterest"("investorId");

-- CreateIndex
CREATE INDEX "FundDisbursement_innovationId_idx" ON "FundDisbursement"("innovationId");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_slug_key" ON "ContentItem"("slug");

-- CreateIndex
CREATE INDEX "ContentItem_type_status_idx" ON "ContentItem"("type", "status");

-- CreateIndex
CREATE INDEX "ContentRevision_contentItemId_idx" ON "ContentRevision"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_code_key" ON "NotificationTemplate"("code");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Mentor_userId_key" ON "Mentor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorMatch_mentorId_innovationId_key" ON "MentorMatch"("mentorId", "innovationId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorFeedback_sessionId_key" ON "MentorFeedback"("sessionId");

-- CreateIndex
CREATE INDEX "PipelineNote_innovationId_idx" ON "PipelineNote"("innovationId");

-- CreateIndex
CREATE UNIQUE INDEX "MinistryFocalPoint_userId_key" ON "MinistryFocalPoint"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MinistrySubmissionCycle_year_key" ON "MinistrySubmissionCycle"("year");

-- CreateIndex
CREATE UNIQUE INDEX "MinistrySubmission_ministryId_cycleId_key" ON "MinistrySubmission"("ministryId", "cycleId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innovator" ADD CONSTRAINT "Innovator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innovator" ADD CONSTRAINT "Innovator_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innovation" ADD CONSTRAINT "Innovation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innovation" ADD CONSTRAINT "Innovation_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innovation" ADD CONSTRAINT "Innovation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innovation" ADD CONSTRAINT "Innovation_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innovation" ADD CONSTRAINT "Innovation_ministryCycleId_fkey" FOREIGN KEY ("ministryCycleId") REFERENCES "MinistrySubmissionCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationTeamMember" ADD CONSTRAINT "InnovationTeamMember_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationTeamMember" ADD CONSTRAINT "InnovationTeamMember_innovatorId_fkey" FOREIGN KEY ("innovatorId") REFERENCES "Innovator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationTeamMember" ADD CONSTRAINT "InnovationTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationAttachment" ADD CONSTRAINT "InnovationAttachment_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationTag" ADD CONSTRAINT "InnovationTag_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationTag" ADD CONSTRAINT "InnovationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationSdgTag" ADD CONSTRAINT "InnovationSdgTag_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationSdgTag" ADD CONSTRAINT "InnovationSdgTag_sdgTagId_fkey" FOREIGN KEY ("sdgTagId") REFERENCES "SdgTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationPanelAssignment" ADD CONSTRAINT "EvaluationPanelAssignment_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationPanelAssignment" ADD CONSTRAINT "EvaluationPanelAssignment_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationPanelAssignment" ADD CONSTRAINT "EvaluationPanelAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAdvisoryFlag" ADD CONSTRAINT "IpAdvisoryFlag_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAdvisoryFlag" ADD CONSTRAINT "IpAdvisoryFlag_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investor" ADD CONSTRAINT "Investor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpressionOfInterest" ADD CONSTRAINT "ExpressionOfInterest_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpressionOfInterest" ADD CONSTRAINT "ExpressionOfInterest_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingAgreement" ADD CONSTRAINT "FundingAgreement_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingAgreement" ADD CONSTRAINT "FundingAgreement_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDisbursement" ADD CONSTRAINT "FundDisbursement_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDisbursement" ADD CONSTRAINT "FundDisbursement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackGrievance" ADD CONSTRAINT "FeedbackGrievance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMatch" ADD CONSTRAINT "MentorMatch_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMatch" ADD CONSTRAINT "MentorMatch_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorFeedback" ADD CONSTRAINT "MentorFeedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MentorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorActivityLog" ADD CONSTRAINT "MentorActivityLog_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineNote" ADD CONSTRAINT "PipelineNote_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineNote" ADD CONSTRAINT "PipelineNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryFocalPoint" ADD CONSTRAINT "MinistryFocalPoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryFocalPoint" ADD CONSTRAINT "MinistryFocalPoint_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistrySubmission" ADD CONSTRAINT "MinistrySubmission_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistrySubmission" ADD CONSTRAINT "MinistrySubmission_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "MinistrySubmissionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryAnnualReport" ADD CONSTRAINT "MinistryAnnualReport_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "MinistrySubmissionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

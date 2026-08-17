/**
 * Enums shared between the NestJS API and the Next.js web app.
 * Mirrors the enums declared in apps/api/prisma/schema.prisma — keep in sync.
 */

// SRS §2.3 — twelve user classes
export enum Role {
  INNOVATION_SUBMITTER = "INNOVATION_SUBMITTER",
  INSTITUTIONAL_COORDINATOR = "INSTITUTIONAL_COORDINATOR",
  EXPERT_EVALUATOR = "EXPERT_EVALUATOR",
  INVESTOR = "INVESTOR",
  STAKEHOLDER_PARTNER = "STAKEHOLDER_PARTNER",
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  PUBLIC_VIEWER = "PUBLIC_VIEWER",
  POLICY_OBSERVER = "POLICY_OBSERVER",
  INNOVATION_MANAGER = "INNOVATION_MANAGER",
  MINISTRY_FOCAL_POINT = "MINISTRY_FOCAL_POINT",
  MENTOR = "MENTOR",
  PRELIMINARY_REVIEWER = "PRELIMINARY_REVIEWER",
  AUTHENTICITY_REVIEWER = "AUTHENTICITY_REVIEWER",
}

// Evaluation / submission workflow state (ToR Module 1: Under Review, Shortlisted, Selected, Archived)
export enum ReviewStatus {
  DRAFT = "DRAFT",
  UNDER_REVIEW = "UNDER_REVIEW",
  AUTHENTICITY_REVIEW = "AUTHENTICITY_REVIEW",
  SHORTLISTED = "SHORTLISTED",
  SELECTED = "SELECTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PUBLISHED = "PUBLISHED",
  UNPUBLISHED = "UNPUBLISHED",
  ARCHIVED = "ARCHIVED",
}

// Maturity of the innovation itself (NIR Content.md filter: Innovation Status)
export enum DevelopmentStage {
  IDEA = "IDEA",
  PROTOTYPE_DEVELOPED = "PROTOTYPE_DEVELOPED",
  PILOT_IMPLEMENTED = "PILOT_IMPLEMENTED",
  COMMERCIALIZED = "COMMERCIALIZED",
  SCALED = "SCALED",
  DISCONTINUED = "DISCONTINUED",
}

export enum InnovationType {
  PRODUCT = "PRODUCT",
  PROCESS = "PROCESS",
  SERVICE = "SERVICE",
  DIGITAL_SOLUTION = "DIGITAL_SOLUTION",
  TECHNOLOGY = "TECHNOLOGY",
  POLICY_INNOVATION = "POLICY_INNOVATION",
  RESEARCH_OUTPUT = "RESEARCH_OUTPUT",
}

export enum OrganizationType {
  GOVERNMENT = "GOVERNMENT",
  UNIVERSITY = "UNIVERSITY",
  STARTUP = "STARTUP",
  PRIVATE_SECTOR = "PRIVATE_SECTOR",
  NGO = "NGO",
  RESEARCH_INSTITUTE = "RESEARCH_INSTITUTE",
  INDIVIDUAL = "INDIVIDUAL",
}

export enum FundingSource {
  A2I_INNOVATION_FUND = "A2I_INNOVATION_FUND",
  GOVERNMENT = "GOVERNMENT",
  DEVELOPMENT_PARTNER = "DEVELOPMENT_PARTNER",
  PRIVATE_INVESTMENT = "PRIVATE_INVESTMENT",
  SELF_FUNDED = "SELF_FUNDED",
}

// ToR §4 — Patent/IP status must be one of exactly these three, plus "none yet"
export enum IpStatus {
  NONE = "NONE",
  PATENTED = "PATENTED",
  PATENT_PENDING = "PATENT_PENDING",
  UNDER_PROCESSING = "UNDER_PROCESSING",
}

export enum EvaluationRecommendation {
  REJECT = "REJECT",
  SHORTLIST = "SHORTLIST",
  FUND = "FUND",
}

// CMS content workflow (SRS FR-C4.M2.02)
export enum ContentStatus {
  DRAFT = "DRAFT",
  IN_REVIEW = "IN_REVIEW",
  APPROVED = "APPROVED",
  PUBLISHED = "PUBLISHED",
}

export enum ContentType {
  PAGE = "PAGE",
  ANNOUNCEMENT = "ANNOUNCEMENT",
  BLOG_POST = "BLOG_POST",
  FAQ = "FAQ",
  NOTIFICATION_TEMPLATE = "NOTIFICATION_TEMPLATE",
}

export enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
  IN_APP = "IN_APP",
}

export enum EoiStatus {
  SUBMITTED = "SUBMITTED",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  IN_DISCUSSION = "IN_DISCUSSION",
  AGREEMENT_SIGNED = "AGREEMENT_SIGNED",
  DECLINED = "DECLINED",
}

export enum ChallengeStatus {
  UPCOMING = "UPCOMING",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  EVALUATING = "EVALUATING",
  COMPLETED = "COMPLETED",
}

export enum SessionStatus {
  PROPOSED = "PROPOSED",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum Locale {
  EN = "en",
  BN = "bn",
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.INNOVATION_SUBMITTER]: "Innovation Submitter",
  [Role.INSTITUTIONAL_COORDINATOR]: "Institutional Coordinator",
  [Role.EXPERT_EVALUATOR]: "Expert Evaluator / Reviewer",
  [Role.INVESTOR]: "Investor",
  [Role.STAKEHOLDER_PARTNER]: "Stakeholder / Partner",
  [Role.PLATFORM_ADMIN]: "Platform Administrator",
  [Role.SYSTEM_ADMIN]: "System Administrator",
  [Role.PUBLIC_VIEWER]: "Public Viewer",
  [Role.POLICY_OBSERVER]: "Policy & Strategy Observer",
  [Role.INNOVATION_MANAGER]: "Innovation Manager",
  [Role.MINISTRY_FOCAL_POINT]: "Ministry Innovation Focal Point",
  [Role.MENTOR]: "Mentor",
  [Role.PRELIMINARY_REVIEWER]: "Preliminary Reviewer",
  [Role.AUTHENTICITY_REVIEWER]: "Authenticity Reviewer",
};

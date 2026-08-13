# Technical Summary — National Innovation Repository (NIR) Platform

## Purpose

A bilingual (EN/BN) platform for Bangladesh implementing the full innovation lifecycle described
in the ToR/SRS — submission, evaluation, funding matchmaking, mentorship, pipeline management,
ministry reporting, and public showcase — with role-based dashboards for 10 of the 12 SRS user
classes (Public Viewer needs no account; Stakeholder/Partner has no SRS-defined actions beyond
public browsing).

## Architecture

Npm-workspaces monorepo with three packages:

### `apps/web`
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- React Query for server state, Zustand for client state (including JWT storage)
- Framer Motion for animation, `next-intl` for i18n
- Routes are locale-scoped under `src/app/[locale]/`: `dashboard`, `repository`, `submit`,
  `challenges`, `news`, `statistics`, `register`, `sign-in`, `about`, `contact`, `resources`
- Role-specific dashboard subtrees: `admin`, `mentor`, `investor`, `ministry`, `moderation`,
  `pipeline`, `reports`, `evaluations`, `innovations`

### `apps/api`
- NestJS (TypeScript), one module per domain (20 modules): `auth`, `innovations`, `evaluations`,
  `funding`, `mentorship`, `pipeline`, `ministries`, `cms`, `reporting`, `repository`,
  `reference-data`, `challenges`, `news`, `resources`, `partners`, `notifications`, `uploads`,
  `users`, `common`, `prisma`
- class-validator DTOs, Swagger docs served at `/api/docs`
- Prisma ORM over PostgreSQL, 47 models

### `packages/shared`
- Cross-cutting TypeScript types, enums, and category constants consumed by both apps

## Database

- **PostgreSQL 16**, accessed exclusively through **Prisma ORM** (`apps/api/src/prisma`,
  schema at `apps/api/prisma/schema.prisma`)
- **47 models** covering every SRS domain, e.g.:
  - Identity/access: `User`, `RefreshToken`, `AuditLog`
  - Reference data: `Category`, `SdgTag`, `Tag`, `Region`, `Ministry`, `Organization`
  - Core submission: `Innovator`, `Innovation`, `InnovationTeamMember`, `InnovationAttachment`,
    `InnovationTag`, `InnovationSdgTag`, `SuccessStory`, `Award`
  - Evaluation: `EvaluationPanelAssignment`, `Evaluation`, `IpAdvisoryFlag`
  - Funding: `Investor`, `ExpressionOfInterest`, `InnovationReferral`, `FundingAgreement`,
    `FundDisbursement`
  - CMS/comms: `ContentItem`, `ContentRevision`, `NotificationTemplate`, `Notification`,
    `MediaAsset`, `FaqItem`, `FeedbackGrievance`, `NewsPost`, `ResourceDocument`, `Challenge`,
    `Partner`
  - Mentorship: `Mentor`, `MentorMatch`, `MentorSession`, `MentorFeedback`, `MentorActivityLog`
  - Pipeline: `PipelineNote`
  - Ministry reporting: `MinistryFocalPoint`, `MinistrySubmissionCycle`, `MinistrySubmission`,
    `MinistryAnnualReport`
  - Search/UX: `SavedSearch`
- **23 enums** for controlled vocabularies (`Role`, `ReviewStatus`, `DevelopmentStage`,
  `PipelineStage`, `InnovationType`, `IpStatus`, `EvaluationRecommendation`, `ContentStatus`,
  `EoiStatus`, `ChallengeStatus`, `SessionStatus`, `Locale`, etc.) rather than free-text or
  separate lookup tables, keeping validation in the schema itself
- IDs are `cuid()` strings; `Innovation` also carries a human-readable unique
  `innovationCode` (e.g. `NIR-2026-000123`) and a unique `slug` for public URLs
- Bilingual fields are modeled as parallel columns (e.g. `titleEn`/`titleBn`,
  `summaryEn`/`summaryBn`) rather than a separate translations table
- `Evaluation.scores` is stored as `Json` (rubric criterion → score map) rather than normalized,
  trading queryability for schema flexibility across evaluation rubrics
- **Migrations**: 3 applied so far — `20260723070321_init`, `20260726090756_add_user_rejected_at`,
  `20260728085750_add_innovation_referral` — managed via `prisma migrate dev` (local) /
  `prisma migrate deploy` (Docker, runs automatically on API container boot)
- **Seeding**: `apps/api/prisma/seed.ts`, run manually (`npx ts-node prisma/seed.ts` or
  `docker compose exec api npx ts-node prisma/seed.ts`) — populates the demo accounts listed below
- Runs on `localhost:5433` in this local setup (mapped from Postgres' default 5432 to avoid
  clashing with any other local Postgres instance)

## Auth & Security

- JWT access + refresh tokens
- RBAC via a `Role[]` claim
- argon2 password hashing
- Helmet, request rate limiting (`@nestjs/throttler`)
- Tokens are held client-side (Zustand + localStorage) rather than httpOnly cookies — a
  documented, accepted tradeoff pending a production hardening pass (XSS exposure)

## Infrastructure

- Docker Compose (`postgres`, `api`, `web` services; `postgres_data` and `api_uploads` volumes)
  is the recommended run path
- API container auto-runs `prisma migrate deploy` on boot
- Local (non-Docker) dev requires Postgres 16+, Node 20+, and manually running
  `prisma migrate dev` plus the seed script (`prisma/seed.ts`)

## Deliberately Mocked Integrations

Each has a stable service interface so a real integration can be dropped in later without
touching callers:

- **NID/Birth Registration & BIN verification** — format-validates and accepts
- **SMS/Email delivery** — logs and marks sent
- **SSO (Google/Apple/Microsoft)** — UI present but disabled; email/password + JWT is the only
  working auth path

## Known Simplifications

Flagged deliberately in the README, not accidental gaps:

- File uploads go to local disk (`apps/api/uploads`), not object storage — fine for a
  single-instance deployment, not for horizontal scaling
- Search is `ILIKE`-based, not Postgres full-text (`tsvector`/GIN) — adequate at seed-data scale,
  worth revisiting against the ToR's <2s search NFR at real data volume

## Demo Accounts

Seeded by `apps/api/prisma/seed.ts`, password `Password123!` for all:

| Email | Role |
|---|---|
| admin@nir.gov.bd | Platform + System Admin |
| coordinator@nir.gov.bd | Institutional Coordinator |
| evaluator@nir.gov.bd | Expert Evaluator |
| manager@nir.gov.bd | Innovation Manager |
| policy@nir.gov.bd | Policy & Strategy Observer |
| investor@nir.gov.bd | Investor |
| mentor@nir.gov.bd | Mentor |
| ministry@nir.gov.bd | Ministry Focal Point (ICT Division) |
| innovator1/2/3@nir.gov.bd | Innovation Submitter |
| prelim-test@nir.gov.bd | Preliminary Reviewer |
| 

## Local Run State (as of 2026-07-29)

Both dev servers verified running locally:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1` (Swagger at `/api/docs`)
- Postgres: `localhost:5433`
- Database: `http://localhost:5555` (Prisma Studio)

Note: the API was started via a one-off `node dist/main` rather than `nest start --watch`,
because watch mode hit a build-cache race on this machine — a stale `tsconfig.build.tsbuildinfo`
made `tsc` skip re-emitting `dist/` after `nest-cli`'s `deleteOutDir` wiped it, crashing with
`Cannot find module 'dist/main'`. Backend code changes won't hot-reload until that's fixed
properly (e.g. switching to a plain `tsc --watch` + restart-on-change setup).

# Project Context — NIR Platform

> Single source of truth for what this project is and why. Read this file first in any new
> session. Update it whenever architecture, stack, or a significant decision changes.

## Overview

The **National Innovation Repository (NIR) Platform** is a full-stack, bilingual (English/Bangla)
web application for Bangladesh that implements the innovation lifecycle described in the
project's ToR (Terms of Reference) and SRS (Software Requirements Specification): submission,
evaluation, funding matchmaking, mentorship, pipeline management, ministry annual reporting, and
public showcase of innovations.

Source requirement documents live in [`Documents/`](../Documents/):
`ToR NIR.docx`, `SRS_NIR_Platform with UML.docx`, `Innovation Policy Zero Draft.docx`,
`Gap Analysis Report - NIR (ToR vs SRS vs Policy).md`, `NIR Content.md` (page copy/content spec),
`Technical Summary - NIR Platform.md` (an earlier engineering snapshot — this `docs/` folder
supersedes it as the maintained reference going forward).

## Vision, Mission, Objectives

*(from `Documents/NIR Content.md` — About page copy)*

- **Vision:** Build a connected, collaborative, innovation-driven Bangladesh where knowledge,
  technology, and innovative solutions are accessible to all and contribute to sustainable
  national development.
- **Mission:** Strengthen Bangladesh's innovation ecosystem by connecting innovators,
  institutions, and innovation-related knowledge through collaboration among government,
  academia, industry, development partners, and civil society.
- **Key objectives:**
  - Reduce innovation redundancy by improving visibility and documentation.
  - Enable innovation upscaling through institutional linkage and exposure.
  - Reduce duplication of funding by identifying previously supported innovations.
  - Promote innovation diffusion across sectors, regions, and communities.
  - Showcase impactful innovations to attract partnerships, funding, or adoption.
  - Strengthen collaboration among universities, startups, government, funders, and industries.
  - Support evidence-informed planning and investment in innovation.

## Features (SRS Component → Code Map)

| # | SRS Component | Backend module (`apps/api/src/...`) | Key frontend routes (`apps/web/src/app/[locale]/...`) |
|---|---|---|---|
| 1 | Innovation Submission & Evaluation | `innovations`, `evaluations` | `/submit`, `/dashboard/innovations`, `/dashboard/evaluations`, `/dashboard/preliminary-review`, `/dashboard/authenticity-review`, `/dashboard/moderation` (Institutional Coordinator only), `/dashboard/admin/evaluations` (admin shortlist + IP-flag overview, grouped by month) |
| 2 | Funding Matchmaking | `funding` | `/dashboard/investor` |
| 3 | Repository & Knowledge Management | `repository`, plus `innovations`' Repository Management endpoints (`/innovations/admin/*`, added 2026-08-17) | `/repository`, `/repository/[slug]`, `/statistics`, `/dashboard/admin/repository` (Platform/System Admin — publish/unpublish, photo/video management, activity log) |
| 4 | Communication & CMS | `cms` (serves news/challenges/resources/partners/FAQ/feedback too — see [API.md](API.md)) | `/news`, `/challenges`, `/resources`, `/faq`, `/contact`, `/dashboard/admin` |
| 5 | Performance Monitoring & Reporting | `reporting` | `/dashboard/reports` |
| 6 | Mentorship & Expert Guidance | `mentorship` | `/dashboard/mentor` |
| 7 | Innovation Management (internal pipeline) | `pipeline` | `/dashboard/pipeline` |
| 8 | Ministry Submission & Annual Reporting | `ministries` | `/dashboard/ministry` |
| — | Reference data (FR-C4.M2.11) | `reference-data` | admin categories tab in `/dashboard/admin` |

Role-based dashboards cover 10 of the 12 originally-scoped SRS user classes — **Public Viewer**
needs no account (all public browsing routes are unauthenticated), and **Stakeholder/Partner**
has no SRS-defined actions beyond public browsing. See [ROLES.md](ROLES.md) for the full
role → permissions → route matrix (the underlying `Role` enum has since grown to 14 values —
see that file for why).

## Architecture

npm-workspaces monorepo, no Docker required for local dev (see [SETUP.md](SETUP.md)):

```
apps/web       Next.js 14 (App Router) frontend
apps/api       NestJS backend (one module per domain, ~20 modules)
packages/shared Cross-cutting TS types, enums, category constants — consumed by both apps
Documents/     Source requirement docs (ToR, SRS, policy, content spec) — not code
```

- **Frontend** talks to the backend only via REST (`NEXT_PUBLIC_API_URL`), never touches the
  database directly.
- **Backend** is the only thing with a Prisma client / DB connection.
- **`packages/shared`** must be built (`npm run build:shared`) before the API or web app, since
  both import compiled output from it (not source).
- **Deployed** (2026-08-13): `apps/web` on Vercel, `apps/api` + PostgreSQL on Railway — split
  across providers because the API's local-disk uploads and persistent DB connection don't fit
  Vercel's serverless model. Full setup, env vars, and gotchas: see
  [SETUP.md § Production Deployment](SETUP.md#production-deployment).

## Technology Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query (server state),
  Zustand (client/session state), `next-intl` (i18n), Framer Motion (animation)
- **Backend:** NestJS (TypeScript), Prisma ORM, class-validator DTOs, Swagger (`/api/docs`)
- **Database:** PostgreSQL 16
- **Auth:** JWT access + refresh tokens, RBAC via a `Role[]` claim, argon2 password hashing,
  Helmet, `@nestjs/throttler` rate limiting (120 req/min)
- **Monorepo tooling:** npm workspaces (no Turborepo/Nx)

Full detail: [API.md](API.md) (backend surface), [DATABASE.md](DATABASE.md) (schema),
[UI_GUIDELINES.md](UI_GUIDELINES.md) (frontend design system).

## Important Decisions

Documented tradeoffs — deliberate, not oversights. Don't "fix" these without raising it first,
since each was an explicit scope call:

- **JWT held in browser (Zustand + localStorage), not httpOnly cookies.** Accepted for this phase
  under an "email/password now, SSO later" decision. Known XSS exposure; flagged for revisit
  before a production rollout.
- **New registrations require admin approval before login works.** `POST /auth/register` never
  issues tokens — it creates an inactive account and an admin must call
  `PATCH /users/:id/status` first. See [API.md](API.md#auth).
- **File uploads go to local disk** (`apps/api/uploads`, Docker volume `api_uploads`), not object
  storage. Fine for a single-instance deployment; not for horizontal scaling.
- **Search is `ILIKE`-based**, not Postgres full-text (`tsvector`/GIN). Adequate at seed-data
  scale; worth revisiting against the ToR's <2s search NFR at real data volume.
- **Three integrations are intentionally mocked** (real BD govt/telecom systems this environment
  has no credentials for), each behind a stable service interface so a real integration can be
  dropped in without touching callers:
  - NID/Birth Registration & BIN verification — `apps/api/src/common/services/identity-verification.service.ts` (format-validates and accepts).
  - SMS/Email delivery — `apps/api/src/notifications/notifications.service.ts` (logs and marks sent).
  - SSO (Google/Apple/Microsoft) — buttons present, disabled in the UI.
- **Bilingual fields are parallel columns** (`titleEn`/`titleBn`, `summaryEn`/`summaryBn`, ...),
  not a separate translations table. Simpler at this schema size; would need revisiting if new
  languages are ever added.
- **`apps/api/src/{challenges,partners,news,resources}/` are empty scaffold folders** (only an
  empty `dto/` subfolder each, no code, not imported anywhere). The real implementation for all
  four lives in `cms/public-content.controller.ts` under `CmsModule`. Don't add code to the
  empty folders expecting it to be wired up — either delete them or route new work through `cms/`.

## Business Rules

- 14 roles exist in the `Role` enum (see [ROLES.md](ROLES.md)); a user can hold multiple roles
  simultaneously (`Role[]` on `User`).
- Self-registration always grants `INNOVATION_SUBMITTER`; a registrant may additionally opt into
  exactly one of `INVESTOR`, `MENTOR`, or `MINISTRY_FOCAL_POINT` at signup, or add one later from
  their dashboard overview page. The sign-up form shows role-specific optional fields once a role
  is picked — Investor: BIN number, sectors interested in funding; Mentor: short bio,
  availability, areas of expertise; Ministry Focal Point: designation/title (in addition to the
  required ministry select) — all persisted immediately into the matching `Investor`/`Mentor`/
  `MinistryFocalPoint` profile row via `AuthService.register`. See [API.md](API.md#auth).
- Every innovation gets a system-generated, human-readable `innovationCode` (e.g.
  `NIR-2026-000123`) and a unique `slug` for public URLs, both assigned via
  `IdGeneratorService`. Innovators similarly get an IRN (`IRN-2026-000123`).
- Innovation review is a staged pipeline: `DRAFT → UNDER_REVIEW → AUTHENTICITY_REVIEW →
  SHORTLISTED → SELECTED → APPROVED → PUBLISHED` (with `REJECTED`/`ARCHIVED` branches available at
  most stages — see `ALLOWED_TRANSITIONS` in `innovations.service.ts` for the exact map)
  (`ReviewStatus`), tracked separately from the internal management `PipelineStage` (`INTAKE →
  UNDER_ASSESSMENT → ADVISORY_SUPPORT → FUNDED → SCALING → CLOSED`).
- **The innovation submitter's own status pills read differently from these internal
  `ReviewStatus` names** — deliberately, not a bug, and each stage now has its own distinct label
  and color: `AUTHENTICITY_REVIEW` (passed Primary/Preliminary Reviewer) reads "Longlisted",
  `SHORTLISTED` (passed Authenticity Reviewer) reads "Midlisted", and `SELECTED` (passed Expert
  Evaluation) reads "Shortlisted". `APPROVED` has no special relabeling — it falls through to the
  default `reviewStatus.replace(/_/g, ' ')`, so it simply reads "APPROVED" (still has its own
  distinct color so it doesn't fall into the earlier no-color bug — see UI_GUIDELINES.md).
  `DRAFT`/`UNDER_REVIEW`/`REJECTED`/`PUBLISHED`/`ARCHIVED` are shown as-is. Every reviewer/
  admin-facing page (moderation, preliminary/authenticity review queues, evaluations, admin
  evaluations) still shows the real `ReviewStatus` names unchanged — only `/dashboard/innovations`
  and `/dashboard/innovations/[id]` (the submitter's own views) use this relabeling. See
  [UI_GUIDELINES.md](UI_GUIDELINES.md).
- **The Expert Evaluator's own SHORTLIST/REJECT decision drives the `SHORTLISTED -> SELECTED` /
  `SHORTLISTED -> REJECTED` transition automatically** — there is no separate Admin/Coordinator
  step in between. `POST /evaluations` (`EvaluationsService.submitEvaluation`) does this
  atomically alongside saving the evaluator's score/comments: if the innovation is still at
  `SHORTLISTED`, a `SHORTLIST` recommendation moves it to `SELECTED`, a `REJECT` recommendation
  moves it to `REJECTED`. First evaluator to submit decides the outcome — a second assigned
  evaluator's later submission is still recorded (their score/vote isn't discarded) but can't
  re-fire or overwrite an already-made decision. The evaluator-facing page
  (`dashboard/evaluations/[innovationId]`) exposes exactly two actions, "Shortlist" and "Reject" —
  there is deliberately no generic "Move to SELECTED" button anywhere representing this decision
  (the Moderation page's per-status transition menu no longer offers `SELECTED` from
  `SHORTLISTED`). `reviewStatus: SELECTED` **is** "the Admin Pending list" — it's exactly the set
  of innovations an Expert Evaluator has shortlisted and that are now eligible for, and awaiting,
  the Admin's own approval decision. The Admin Evaluations page's Pending/Reviewed tabs
  (`dashboard/admin/evaluations/page.tsx`) read this directly: **Pending** =
  `reviewStatus === 'SELECTED'`, **Reviewed** = `APPROVED`/`REJECTED`/`PUBLISHED`/`ARCHIVED` (the
  `REJECTED` branch only ever matches a rare edge case — a second assigned evaluator's stray
  `SHORTLIST` vote recorded *after* a first evaluator's `REJECT` had already settled the
  innovation; the underlying `GET /evaluations/shortlisted` list is scoped to
  `Evaluation.recommendation === 'SHORTLIST'` rows regardless of the innovation's current status,
  so that stray vote still surfaces here but must read as settled/"Reviewed", not "Pending"). See
  [API.md](API.md#evaluations-evaluations) and [UI_GUIDELINES.md](UI_GUIDELINES.md).
- **Admin Approval and Publication are two separate events — `APPROVED` does not mean
  `PUBLISHED`, and must never be treated as the same status or action.** The Admin's "Save approval
  decisions" button (`PATCH /innovations/:id/approval` with `finalize: true`) moves
  `SELECTED -> APPROVED` atomically with saving whatever Recognition/Mentor/Fund decisions were
  set — this is what actually moves an innovation from the Admin Evaluations page's Pending tab to
  Reviewed, and redirects the Admin back to `/dashboard/admin/evaluations?saved=1` (a dismissible
  "Approval decision saved successfully" banner, auto-clearing after a few seconds). It does
  **not** set `publishedAt`, and an approved innovation does **not** automatically become
  published — publication (`APPROVED -> PUBLISHED`) is a fully separate, later action. As of
  2026-08-17 it's reachable both via the Moderation page's generic transition tool and via the
  dedicated Admin Repository Management page (`/dashboard/admin/repository`, Platform/System Admin
  only) — see the `UNPUBLISHED` bullet below. Once an innovation leaves `SELECTED` (i.e. is
  `APPROVED` or later),
  `dashboard/admin/evaluations/[innovationId]`'s Permission & Approval section renders **read-only**
  — every toggle, comment field, the letter-upload control, and the Save button are all hidden or
  replaced with plain view-only display; the Admin can view but never re-enter, edit, or resubmit a
  decision once made. The same `PATCH /innovations/:id/approval` endpoint is also called, without
  `finalize`, for the incidental approval-letter-upload save (only reachable pre-`APPROVED`, since
  the upload control itself is part of what gets hidden) — that call deliberately does not approve
  or redirect, since uploading a letter isn't itself a decision. See
  [API.md](API.md#innovations-innovations) and [UI_GUIDELINES.md](UI_GUIDELINES.md).
- **Admin Repository Management (added 2026-08-17)** — `/dashboard/admin/repository`
  (`PLATFORM_ADMIN`/`SYSTEM_ADMIN` only) lists `APPROVED` (not yet published), `PUBLISHED`, and
  `UNPUBLISHED` innovations by default, with search (title/code), category, status, and
  published-date-range filters; `ARCHIVED` is excluded from the default view but selectable
  explicitly via the status filter, so archived innovations stay findable without cluttering the
  everyday "active repository" list. The list is **server-side paginated** (2026-08-17 —
  `InnovationsService.findForRepositoryManagement`'s `skip`/`take` already supported this; only the
  page-size selector, Previous/Next, and page-number UI were missing before) — 10/20/50 rows per
  page (`components/ui/pagination.tsx`), any filter/search/status change resets to page 1, and a
  `useEffect` snaps the page back if an action (e.g. archiving the last item on the last page)
  shrinks `totalPages` below the current page. `placeholderData: keepPreviousData` on the query
  keeps the current rows visible (dimmed) while a page/filter change or a post-action refetch
  resolves, instead of flashing a full loading state. An admin can **publish** (`APPROVED`/`UNPUBLISHED` →
  `PUBLISHED`, via the same generic `PATCH /innovations/:id/status` every other transition uses),
  **unpublish** (`PUBLISHED` → `UNPUBLISHED`), or **archive** (`APPROVED`/`PUBLISHED`/`UNPUBLISHED`
  → `ARCHIVED`, same endpoint again, confirmation required — framed as "no longer actively
  maintained / remove from the active repository") any innovation. Unpublishing *and* archiving
  both remove it from public repository search/detail immediately (`RepositoryService.search` and
  `InnovationsService.findOneForViewer` both gate on `reviewStatus === 'PUBLISHED'`, so anything
  else — `UNPUBLISHED`, `ARCHIVED`, or any earlier pipeline stage — is excluded the same way,
  no new visibility code needed) while preserving `publishedAt` history; re-publishing sets a
  fresh `publishedAt`. **`ARCHIVED`'s only forward transition remains `-> UNDER_REVIEW`**
  (unchanged, pre-existing) — there is deliberately no "un-archive" button on this page; restoring
  an archived innovation means sending it back through the full review pipeline from the
  Moderation page. The Moderation page's generic transition buttons deliberately do **not**
  expose `UNPUBLISHED` (kept scoped to this dedicated UI), even though the underlying status and
  endpoint are shared; `ARCHIVED` remains available from both pages since it predates this module.
  An admin can also **feature/unfeature** any innovation (`PATCH /innovations/:id/featured`,
  independent of `reviewStatus` — can be set before publishing but only has a visible effect once
  `PUBLISHED`) — this is what the homepage's Featured section
  (`components/home/featured-innovations.tsx` → `GET /repository/featured`, pre-existing, reads
  `isFeatured: true` + `reviewStatus: 'PUBLISHED'`) and the public repository's featured filtering
  actually surface; before this module, `Innovation.isFeatured` had no admin-facing way to be set
  at all (Challenges have had an equivalent star-toggle for longer — see
  `dashboard/admin/page.tsx`). The same page also manages an innovation's `PHOTO`/`VIDEO`
  attachments (upload, replace-in-place via `PATCH /innovations/:id/attachments/:attachmentId`,
  remove) and shows a full admin activity log per innovation and repository-wide
  (`GET /innovations/:id/activity-log` / `/innovations/admin/activity-log`, reading the
  pre-existing `AuditLog` table, which previously had no read endpoint at all). Every action here
  — status change (including archive), media upload/replace/remove, featured toggle — writes an
  `AuditLog` row with actor, timestamp, and before/after metadata; unpublish, archive, and media
  remove/replace are gated behind a confirmation dialog (`components/ui/confirm-dialog.tsx`, the
  first confirm-dialog component in this codebase) — featuring/unfeaturing is not, since it's
  reversible and non-destructive (matches the pre-existing Challenge featured-toggle's lack of
  confirmation). See [API.md](API.md#innovations-innovations), [DATABASE.md](DATABASE.md), and
  [UI_GUIDELINES.md](UI_GUIDELINES.md).
- Full history of Preliminary/Authenticity reviewer comments is kept in `ReviewComment`
  (separate from `Innovation.reviewRemarks`, which only holds the latest note), so context isn't
  lost across reject/resubmit loops.

## Demo Accounts

Seeded by `apps/api/prisma/seed.ts`, password `Password123!` for all. No longer rendered on the
sign-in page — the demo accounts list there was removed (2026-08-17) so this table is now the only
place these are listed:

| Email | Role |
|---|---|
| admin@nir.gov.bd | Platform + System Admin |
| coordinator@nir.gov.bd | Institutional Coordinator |
| evaluator@nir.gov.bd / evaluator2/3/4@nir.gov.bd | Expert Evaluator (4 accounts) |
| preliminary@nir.gov.bd | Preliminary Reviewer |
| authenticity@nir.gov.bd | Authenticity Reviewer |
| manager@nir.gov.bd | Innovation Manager |
| policy@nir.gov.bd | Policy & Strategy Observer |
| investor@nir.gov.bd | Investor |
| mentor@nir.gov.bd | Mentor |
| ministry@nir.gov.bd | Ministry Focal Point (ICT Division) |
| stakeholder@nir.gov.bd | Stakeholder / Partner |
| innovator1/2/3@nir.gov.bd | Innovation Submitter |

Any user can additionally opt into the Investor, Mentor, or Ministry Focal Point role from their
dashboard overview page.

The seed also creates 11 **pending** (`isActive: false`) demo registrations — `pending1`–
`pending11@nir.gov.bd` — spanning almost every role, so the "User Approvals" admin page
(`/dashboard/admin/approvals`) has a realistic queue to demo out of the box. Note in `seed.ts`:
Evaluator/Reviewer/Coordinator/Manager/Policy-Observer aren't actually choosable at real
registration (see `RegisterDto`'s `SELF_SERVICE_ROLES`) — those specific pending rows are demo
content only, not a reflection of what the public sign-up form allows.

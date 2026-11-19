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
| 1 | Innovation Submission & Evaluation | `innovations`, `evaluations`, `challenges` (challenge submissions, form builder with conditional fields (2026-11-17), submission monitoring — 2026-11-10), `settings` (general-submission switch) | `/submit`, `/challenges/[slug]/submit` (challenge submission, login required), `/dashboard/admin/submissions` (general switch + monitoring), `/dashboard/innovations`, `/dashboard/evaluations`, `/dashboard/preliminary-review`, `/dashboard/authenticity-review`, `/dashboard/moderation` (Institutional Coordinator only), `/dashboard/admin/evaluations` (admin shortlist + IP-flag overview, grouped by month) |
| 2 | Funding Matchmaking | `funding` | `/dashboard/investor` |
| 3 | Repository & Knowledge Management | `repository`, plus `innovations`' Repository Management endpoints (`/innovations/admin/*`, added 2026-08-17) | `/repository`, `/repository/[slug]`, `/statistics`, `/dashboard/admin/repository` (Platform/System Admin — publish/unpublish, photo/video management, activity log) |
| 4 | Communication & CMS | `cms` (serves news/resources/partners/FAQ/feedback too — see [API.md](API.md)); challenges moved to their own `challenges` module on 2026-11-10 | `/news`, `/challenges`, `/resources`, `/faq`, `/contact`, `/dashboard/admin` |
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
- **GitLab CI** (`.gitlab-ci.yml`, on GitLab branches only): verifies builds and publishes API/web
  images to `registry.a2i.gov.bd`. It does not deploy, and dev.challenge.gov.bd is still deployed
  by hand. See [SETUP.md § GitLab CI pipeline](SETUP.md#gitlab-ci-pipeline-gitlab-ciyml).

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
- **A verified OTP approves and activates a new account (decided 2026-11-15, replacing the
  admin approval gate).** `POST /auth/register` creates the account active and returns a login
  session, so the user lands in their dashboard (or back on the challenge form they came from)
  right after entering the code. Applies to every self-registration role (Innovation Submitter,
  Investor, Mentor, Ministry Focal Point). Admins can still deactivate an account from User
  Approvals / the users list; that page now only holds older pending accounts. See
  [API.md](API.md#auth) and [ROLES.md](ROLES.md).
- **Every new registration is an Innovation Submitter only (decided 2026-11-16, temporary).**
  The register form shows the role fixed to Innovation Submitter and `POST /auth/register`
  rejects any other `role` (400). Investor / Mentor / Ministry Focal Point are not self-selectable
  at sign-up until `SELF_SERVICE_ROLES_AT_SIGNUP` is switched back on (API + web).
- **Challenge submit-button label is admin-configurable (2026-11-16)** per challenge, in English
  and Bangla; blank means the default label. See [UI_GUIDELINES.md](UI_GUIDELINES.md).
- **Registration is OTP-verified before the account exists; every login is CAPTCHA-checked**
  (2026-11-12). The registrant picks email or SMS, receives a 6-digit code, and the account is
  created only when the code matches, so no unverified rows are created. The CAPTCHA provider is pluggable (Turnstile / reCAPTCHA v2 /
  hCaptcha), and so are email (SMTP) and SMS (a template-driven HTTP client, because BD
  aggregators all differ). In production the API **refuses to start** unless each integration is
  chosen explicitly, so security controls can't silently go missing. Prerequisites and config are
  in [SETUP.md](SETUP.md#registration-otp--login-captcha--prerequisites-and-configuration).
- **Admin bulk messaging is OTP-confirmed, snapshotted and paced in-process (2026-11-18).** A
  send needs a fresh code to the admin's own email/phone; recipients are frozen at send time;
  delivery is an in-process worker (no queue infrastructure — fine for one API instance and the
  ~2 000/day Gmail cap), resumable after a restart. Duplicate sends are blocked three ways:
  client request key (idempotent replays), 24 h identical-content guard (explicit override), one
  running send per challenge+channel. Bulk SMS needs a non-OTP Teletalk class
  (`SMS_TELETALK_BULK_SMS_CLASS`) — the OTP class rejects >70 bytes — and is disabled until set.
- **All OTP emails share one branded HTML template (2026-11-18)** — `messaging/templates/otp-email.ts`,
  copy per `OtpPurpose` in en + bn, logo as an inline CID image. SMS stays plain text. Details in
  [UI_GUIDELINES.md](UI_GUIDELINES.md#otp-email-template-2026-11-18).
- **Forgot password reuses the registration OTP machinery (2026-11-18).** Same `OtpService`
  (purpose `PASSWORD_RESET`), same CAPTCHA, same limits; no separate reset-link/email-token
  system. After the code is verified the client gets a stateless 10-minute JWT (separate signing
  key from access tokens, invalidated by the password change itself). The flow tells the user
  plainly when no account has that email/number, because registration already discloses that.
  Details in [API.md](API.md).
- **File uploads go to local disk** (`apps/api/uploads`, Docker volume `api_uploads`), not object
  storage. Fine for a single-instance deployment; not for horizontal scaling.
- **Search is `ILIKE`-based**, not Postgres full-text (`tsvector`/GIN). Adequate at seed-data
  scale; worth revisiting against the ToR's <2s search NFR at real data volume.
- **Three integrations are intentionally mocked** (real BD govt/telecom systems this environment
  has no credentials for), each behind a stable service interface so a real integration can be
  dropped in without touching callers:
  - NID/Birth Registration & BIN verification — `apps/api/src/common/services/identity-verification.service.ts` (format-validates and accepts).
  - SMS/Email delivery of **notifications** — `apps/api/src/notifications/notifications.service.ts` (logs and marks sent).
    *Real* transports now exist (2026-11-12, `apps/api/src/messaging/`: `MailService` over SMTP,
    `SmsService` over Teletalk Bulk SMS (the a2i account) or a configurable HTTP gateway) but are used only for registration and password-reset OTPs so far.
    Wiring `NotificationsService.deliver()` to them is open work (it would also need the
    recipient's address/phone, which `deliver()` doesn't receive today) — see [ROADMAP.md](ROADMAP.md).
  - SSO (Google/Apple/Microsoft) — not wired; the placeholder buttons are hidden on sign-in and
    register since 2026-11-16.
- **Bilingual fields are parallel columns** (`titleEn`/`titleBn`, `summaryEn`/`summaryBn`, ...),
  not a separate translations table. Simpler at this schema size; would need revisiting if new
  languages are ever added.
- **`apps/api/src/{partners,news,resources}/` are empty scaffold folders** (only an empty
  `dto/` subfolder each, no code, not imported anywhere). The real implementation for all three
  lives in `cms/public-content.controller.ts` under `CmsModule`. Don't add code to the empty
  folders expecting it to be wired up — either delete them or route new work through `cms/`.
  **`challenges/` is no longer empty** (2026-11-10): challenge CRUD moved out of `cms/` into a
  real `ChallengesModule` (`challenges.controller.ts`/`.service.ts`/`challenge-rules.ts`) when
  challenges gained per-challenge submission forms.
- **Challenge submissions are ordinary `Innovation` rows, not a separate entity** (2026-11-10).
  A challenge submission is created straight into `UNDER_REVIEW` with `submissionChannel:
  CHALLENGE`, `challengeId` and a `challengeResponses` JSON snapshot. This was chosen so the
  entire existing review pipeline (queues, category routing, status transitions, evaluations,
  approvals, audit log) works on challenge submissions with zero changes. The dynamic form's
  answers are snapshotted (label/type copied per answer) rather than referencing
  `ChallengeFormField` rows, so editing or deleting form fields can never alter past submissions.
- **Challenge details fields are a per-challenge JSON list, not a shared template** (2026-11-18,
  user's choice). Each challenge defines its own fields (no global catalogue and no default
  fields — a new challenge starts empty and the admin creates every field, also the user's choice). Stored as JSON on
  `Challenge` (not a table like `ChallengeFormField`) because the set-up and the content are saved
  together from one form and never queried per field. One rule module in `@nir/shared` is used by
  both the API and the admin form, so inline errors and server 400s always agree.
- **Dynamic form definitions live in a relational table (`ChallengeFormField`), answers in JSON**
  — the definition benefits from per-field rows (ordering, unique keys per challenge, FK cascade),
  while answers are read-mostly, per-submission, and must be immutable snapshots.

## Business Rules

- 14 roles exist in the `Role` enum (see [ROLES.md](ROLES.md)); a user can hold multiple roles
  simultaneously (`Role[]` on `User`).
- Challenge **participants** (admin export + bulk messages, 2026-11-18) are the distinct users who
  submitted a non-draft innovation to the challenge; a person with several submissions counts
  once. Bulk messages skip inactive accounts and missing/invalid emails or BD mobiles (shown to
  the admin with reasons before sending), go to at most `BULK_MAX_RECIPIENTS` (2 000) per send,
  and personalise `{{name}}`, `{{challenge}}` (Bangla title for Bangla-locale participants),
  `{{irn}}`.
- Registration (2026-11-12) is two steps: (1) form + CAPTCHA → `POST /auth/otp/send` emails or texts
  a 6-digit code to the chosen address (phone becomes required if SMS is chosen); (2) enter the
  code → `POST /auth/register`. Codes last 5 min, allow 5 wrong attempts, resend after 60 s, and
  are capped at 5 per address per hour (all env-tunable). An address that already has an account
  is refused at step 1. Phones are stored normalized as `+8801XXXXXXXXX`.
- Sign-in requires a solved CAPTCHA on **every** attempt, checked before the password.
- Forgot password (2026-11-18, `/forgot-password`, linked from sign-in): (1) choose email or SMS,
  enter the registered address/number + CAPTCHA → code (same 5-min / 60-s resend / 5-per-hour /
  5-attempt limits as registration); (2) enter the code; (3) new password (min 8, max 128, typed
  twice, must differ from the current one) within 10 minutes. Success signs the account out on
  every device (all refresh tokens revoked) and the user signs in again. Inactive accounts can't
  reset. Resetting by a channel marks that email/phone as verified.
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
  only) — see the `UNPUBLISHED` bullet below. Since 2026-11-15 it is also on the Admin Evaluations
  pages: a **Publish** button on each `APPROVED`/`UNPUBLISHED` row of the Reviewed tab, and a
  **Publication** panel on the detail page (Publish, or "View public page" once live). It's still
  a separate click with its own confirmation, never part of the approval save. Innovations that
  requested no Recognition/Mentor/Fund support get an "Approve innovation" button (previously no
  button at all, so they could never be approved or published from this page). Once an innovation leaves `SELECTED` (i.e. is
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
- **Admin "Submit & publish" (added 2026-11-04)** — a Platform/System Admin can add an
  innovation and publish it directly, skipping the review pipeline entirely. Entry point: "Add
  innovation" on `/dashboard/admin/repository` (or "My innovations", now also in the admin
  sidebar) → the normal `/submit` form → the manage page `/dashboard/innovations/[id]`, where admins
  see a "Ready to publish?" panel with a **Submit & publish** button (confirmation dialog) instead
  of "Submit for review"; on success it redirects to Repository Management, where the innovation
  can be unpublished/archived/featured like any other. Admins need no `Innovator` profile to create
  one (so they don't inflate the public "innovators" count); no "Lead Innovator" team row is
  auto-created — the admin adds the real innovator/team by name. The public detail page's
  **"Submitted by" shows the admin's name** for these (via `Innovation.createdByAdmin` — set only by
  this flow, so the bulk-imported innovations that also list the admin as submitter keep showing
  their real lead innovator); the team members still appear in the Team section. The name is not
  linked to `/dashboard/submitters/:id`, which is an innovator profile page. **Only the admin's own drafts can
  be published this way** — an innovator's draft still has to go through the full review pipeline.
  See [API.md](API.md#innovations-innovations).
- **Two independent submission channels (added 2026-11-10).**
  - **General submission** — the standard `/submit` form. Controlled by a single admin switch
    (`PlatformSetting` key `generalSubmissionEnabled`, default **on** so existing behaviour was
    preserved) on `/dashboard/admin/submissions`. When off, every public "Submit an Innovation"
    entry point (header desktop + mobile, homepage hero, footer, `/challenges` callout) is hidden,
    `/submit` shows a "closed — browse open challenges" notice, and the API refuses
    `POST /innovations` and `POST /innovations/:id/submit` of a GENERAL **draft** with 403.
    Exceptions, both deliberate: Platform/System Admins bypass the switch (their "Submit & publish"
    flow is an internal tool), and re-submitting a **REJECTED** general innovation is still allowed
    (it continues an existing review rather than opening a new submission).
  - **Challenge submission** — each challenge gets its own entry point
    (`/challenges/:slug/submit`, "Submit Innovation" buttons on `/challenges`, the detail page,
    the homepage banner and the popup). A challenge **accepts submissions only when all of these
    hold** (`challenge-rules.ts` `submissionState`, enforced server-side, reason returned as
    `closedReason`): `isPublished`, `isActive`, `submissionsEnabled`, `status === OPEN`, today
    is within `startDate`..end-of-`deadline`-day (UTC), it has a `categoryId`, and its form has
    at least one field. The category is required because it is what routes submissions to
    Preliminary/Authenticity reviewers — enabling submissions without one is refused (400).
    **Login is mandatory**: the submit page redirects anonymous visitors to
    `/sign-in?next=/challenges/:slug/submit`; sign-in returns there afterwards and carries `next`
    through to `/register` and back (since 2026-11-15 a verified OTP signs the new user in and
    returns them straight to the challenge form).
    The API refuses anonymous submissions (401) and requires an `Innovator` profile (403
    otherwise). Answers are validated server-side against the challenge's current form; files
    must be real `/uploads/<uuid>.<ext>` uploads on disk, of an accepted type and within the
    field's size limit (size read from disk, not the client). Uploaded files also become
    `InnovationAttachment` rows so existing reviewer views show them.
  - **New challenges start unpublished** (the admin UI sends `isPublished: false` on create) so
    the admin can build and preview the form first; the API default is still `true` for
    backwards compatibility. Inactive challenges stay listed publicly but are never chosen for the
    homepage banner/popup. A challenge that has submissions cannot be deleted (409) — unpublish
    or deactivate it instead.
  - **Field mapping:** text fields can be mapped to `TITLE`/`SUMMARY`/`PROBLEM_STATEMENT`/
    `PROPOSED_SOLUTION` so the innovation reads sensibly in every existing queue. Fallbacks when
    unmapped: title "<challenge> — submission by <name>", summary = first long-text answer,
    problem/solution = "See the challenge submission responses (<challenge>)."
    `innovationType` is always `PRODUCT` (required column, not collected by challenge forms).
  - **Challenge details page (2026-11-11):** the popup is a short teaser; the full challenge
    information (problem, eligibility, timeline, criteria, prizes, resources, FAQ, contact) lives
    on `/challenges/:slug`, every section optional and hidden when empty.
  - **Configurable details fields (2026-11-18):** the text sections of the details page are no
    longer fixed — each challenge has its own field list that Platform admins build in the
    Create/Edit challenge form: section (groups fields under one heading), label, input type (short
    / long text, number, email, phone, URL, date, dropdown, radio, checkboxes, file), placeholder,
    help text, options and validation rules (required, length, range, number of choices, regex), all
    in English and Bangla, plus the value itself (English + Bangla for text). New challenges start
    with no fields. Empty fields are hidden publicly; a challenge can't be saved
    while a field breaks its rules (checked in the form and again by the API). Placeholder / help
    text guide the admin only — they are never shown publicly. Timeline, attachments, FAQ and
    contact stay structured lists. The Contact box is likewise made only of admin-defined **contact
    fields** (same builder, no sections; no fixed name / email / phone). See
    [DATABASE.md](DATABASE.md#component-4--communication--cms) and
    [UI_GUIDELINES.md](UI_GUIDELINES.md#reusable-patterns).
  - **Who sees the answers:** `challengeResponses` is returned only to the submitter and to
    review/admin roles (Platform/System Admin, Coordinator, Innovation Manager, Preliminary/
    Authenticity Reviewer, Expert Evaluator); everyone else gets `null`, even once published.
  - **Evaluator view (2026-11-16):** on `/dashboard/evaluations/[innovationId]`, a challenge
    submission hides the **Innovation details** and **Support requested** cards. Evaluators judge
    the challenge form answers, and those generic fields are mostly defaults for challenge entries.
    General submissions still show both cards, and the admin evaluation page is unchanged.
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

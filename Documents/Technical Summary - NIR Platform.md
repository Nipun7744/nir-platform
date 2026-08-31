# Technical Summary — National Innovation Repository (NIR) Platform

> **This file is an engineering snapshot, last refreshed 2026-08-25 — [`docs/`](../docs/) is the
> maintained, authoritative reference going forward** (see
> [`docs/PROJECT_CONTEXT.md`](../docs/PROJECT_CONTEXT.md)). If anything here disagrees with
> `docs/`, trust `docs/`; if `docs/` disagrees with the actual code, trust the code. Kept around as
> a quick standalone orientation document, not a substitute for the six files under `docs/`.

## Purpose

A bilingual (EN/BN) platform for Bangladesh implementing the full innovation lifecycle described
in the ToR/SRS — submission, evaluation, funding matchmaking, mentorship, pipeline management,
ministry reporting, and public showcase — with role-based dashboards for 10 of the 12 SRS user
classes (Public Viewer needs no account; Stakeholder/Partner has no SRS-defined actions beyond
public browsing). **Live in production since 2026-08-13** — see Deployment below.

## Architecture

Npm-workspaces monorepo with three packages:

### `apps/web`
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- React Query for server state, Zustand for client state (including JWT storage, persisted to
  `localStorage`)
- Framer Motion for animation, `next-intl` for i18n (EN default, BN prefixed `/bn/...`)
- Routes are locale-scoped under `src/app/[locale]/`: `about`, `challenges` (+ `[slug]`),
  `contact`, `faq`, `news` (+ `[slug]`), `register`, `repository` (+ `[slug]`), `resources`,
  `sign-in`, `statistics`, `submit`
- `dashboard/` (shared authenticated shell via `dashboard-shell.tsx`): `admin` (tabs: users,
  categories, news, challenges, resources, partners, faq) + `admin/evaluations` (+ `[innovationId]`
  detail/approval), `admin/approvals`, `admin/repository` (Repository Management — publish/
  unpublish, media, activity log), `authenticity-review`, `evaluations` (+ `[innovationId]`),
  `innovations` (+ `[id]`), `investor`, `mentor`, `ministry`, `moderation`, `pipeline`,
  `preliminary-review`, `profile`, `reports`, `submitters/[userId]` (admin-only view of a
  submitter's profile)
- No shared UI component primitives (`Button`/`Input`/`Card` are hand-rolled per page, plain
  Tailwind utilities + `clsx`) — see [`docs/UI_GUIDELINES.md`](../docs/UI_GUIDELINES.md)

### `apps/api`
- NestJS (TypeScript), one module per domain (20 folders under `src/`): `auth`, `challenges`*,
  `cms`, `common`, `evaluations`, `funding`, `innovations`, `mentorship`, `ministries`, `news`*,
  `notifications`, `partners`*, `pipeline`, `prisma`, `reference-data`, `reporting`, `repository`,
  `resources`*, `uploads`, `users` (*`challenges`/`news`/`partners`/`resources` are empty scaffold
  folders — the real implementation for all four lives in `cms/public-content.controller.ts`, see
  [`docs/PROJECT_CONTEXT.md`](../docs/PROJECT_CONTEXT.md#important-decisions))
- class-validator DTOs, Swagger docs served at `/api/docs`
- Prisma ORM over PostgreSQL — **48 models, 24 enums, 19 migrations applied** (as of
  2026-08-17's `add_unpublished_review_status`)
- JWT access + refresh tokens, RBAC via a 14-value `Role[]` claim (see
  [`docs/ROLES.md`](../docs/ROLES.md) for why 14 and not the SRS's original 12), argon2 password
  hashing, Helmet, `@nestjs/throttler` rate limiting (120 req/min)

### `packages/shared`
- Cross-cutting TypeScript types, enums, and category constants consumed by both apps — must be
  built (`npm run build:shared`) before either app, since both import compiled output, not source

## Database

- **PostgreSQL 16/17**, accessed exclusively through **Prisma ORM** (`apps/api/src/prisma`, schema
  at `apps/api/prisma/schema.prisma`)
- 48 models spanning identity/access, reference data, core submission, evaluation, funding,
  CMS/comms, mentorship, pipeline, and ministry reporting — full breakdown in
  [`docs/DATABASE.md`](../docs/DATABASE.md)
- 24 enums for controlled vocabularies (`Role`, `ReviewStatus`, `DevelopmentStage`,
  `PipelineStage`, `InnovationType`, `IpStatus`, `EvaluationRecommendation`, `ContentStatus`,
  `EoiStatus`, `ChallengeStatus`, `SessionStatus`, `Locale`, etc.)
- IDs are `cuid()` strings; `Innovation` also carries a human-readable unique `innovationCode`
  (e.g. `NIR-2026-000123`) and a unique `slug` for public URLs; `Innovator` similarly gets an IRN
  (`IRN-2026-000123`)
- Bilingual fields are parallel columns (`titleEn`/`titleBn`, `summaryEn`/`summaryBn`, ...), not a
  separate translations table
- `Evaluation.scores` is stored as `Json` (rubric criterion → score map) rather than normalized
- Review pipeline is staged: `DRAFT → UNDER_REVIEW → AUTHENTICITY_REVIEW → SHORTLISTED →
  SELECTED → APPROVED → PUBLISHED` (`REJECTED`/`ARCHIVED`/`UNPUBLISHED` branches available at most
  stages), tracked separately from the internal `PipelineStage` — see
  [`docs/PROJECT_CONTEXT.md`](../docs/PROJECT_CONTEXT.md#business-rules) for the full staged-review
  history and why it grew from the SRS's originally simpler flow

## Auth & Security

- JWT access + refresh tokens, RBAC via a `Role[]` claim, argon2 password hashing, Helmet,
  `@nestjs/throttler` rate limiting
- New self-registrations require admin approval (`POST /auth/register` creates an inactive account;
  no tokens issued until an admin flips `isActive`)
- Tokens are held client-side (Zustand + `localStorage`) rather than httpOnly cookies — a
  documented, accepted tradeoff pending a production hardening pass (XSS exposure)

## Deployment

Split across two providers, live since 2026-08-13 — full detail, env vars, and gotchas in
[`docs/SETUP.md`](../docs/SETUP.md#production-deployment):

| Component | Provider | URL |
|---|---|---|
| `apps/web` (Next.js) | Vercel, auto-deploys on push to `master` | https://nir-platform-web.vercel.app |
| `apps/api` (NestJS) | Railway | https://api-production-2d78.up.railway.app (`/api/v1`) |
| PostgreSQL | Railway | internal only |
| Source | GitHub (public) | https://github.com/Nipun7744/nir-platform |

Local dev on the current working machine runs **without Docker** (native PostgreSQL on a
non-default port, `nest start --watch` has a build-cache bug worked around with a manual
build+run step) — see [`docs/SETUP.md`](../docs/SETUP.md) for the exact commands and
machine-specific gotchas. Docker Compose (`postgres`/`api`/`web` services) remains supported as
the general recommended path when Docker is available.

## Deliberately Mocked Integrations

Each has a stable service interface so a real integration can be dropped in later without
touching callers:

- **NID/Birth Registration & BIN verification** — format-validates and accepts
- **SMS/Email delivery** — logs and marks sent
- **SSO (Google/Apple/Microsoft)** — UI present but disabled; email/password + JWT is the only
  working auth path

## Known Simplifications / Technical Debt

Flagged deliberately, not accidental gaps — full list in
[`docs/ROADMAP.md`](../docs/ROADMAP.md#known-issues):

- File uploads go to local disk (a persistent Railway volume in production), not object storage —
  fine for a single-instance deployment, not for horizontal scaling
- Search is `ILIKE`-based, not Postgres full-text (`tsvector`/GIN) — adequate at seed-data scale,
  worth revisiting against the ToR's <2s search NFR at real data volume
- Two Tailwind color palettes coexist (`ink`/`brand`/`sun`/`clay` vs. the actually-used NIR flat
  set) — not yet consolidated
- No shared UI component primitives — every page hand-rolls its own `Button`/`Input`/`Card`

## Demo Accounts

Seeded by `apps/api/prisma/seed.ts`, password `Password123!` for all — full table with role
descriptions in [`docs/PROJECT_CONTEXT.md`](../docs/PROJECT_CONTEXT.md#demo-accounts):

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

Any user can additionally opt into Investor, Mentor, or Ministry Focal Point from their own
dashboard overview page. The seed also creates 11 pending (`isActive: false`) registrations
(`pending1`–`pending11@nir.gov.bd`) for the User Approvals demo queue.

## Local Run State (as of 2026-08-25)

Both dev servers verified running locally (no-Docker path):

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1` (Swagger at `/api/docs`)
- Postgres: `localhost:5433`

The API is started via a one-off `npm run build && node dist/main.js` rather than
`npm run start:dev` (`nest start --watch`), because watch mode hits a build-cache race on this
machine — a stale `tsconfig.build.tsbuildinfo` can make `tsc` skip re-emitting `dist/` after
`nest-cli`'s `deleteOutDir` wipes it. Backend code changes don't hot-reload with this workaround —
re-run the build-and-run step after editing backend code. Full detail, including the exact
recovery command if a stale build is suspected, in
[`docs/SETUP.md`](../docs/SETUP.md#known-environment-specific-issues-this-machine).

## Where to look next

For anything beyond this snapshot, go to `docs/` directly:

- [`docs/PROJECT_CONTEXT.md`](../docs/PROJECT_CONTEXT.md) — full feature map, architecture,
  business rules, demo accounts
- [`docs/API.md`](../docs/API.md) — every endpoint, request/response shapes, auth
- [`docs/DATABASE.md`](../docs/DATABASE.md) — full schema, relationships, migration history
- [`docs/UI_GUIDELINES.md`](../docs/UI_GUIDELINES.md) — design tokens, components, layout/
  responsiveness conventions
- [`docs/ROLES.md`](../docs/ROLES.md) — the full role → permissions → route matrix
- [`docs/ROADMAP.md`](../docs/ROADMAP.md) — completed/current/upcoming work, known issues
- [`docs/SESSION_LOG.md`](../docs/SESSION_LOG.md) — chronological history of every working session
- [`docs/SETUP.md`](../docs/SETUP.md) — local dev setup and production deployment detail

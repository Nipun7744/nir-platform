# National Innovation Repository (NIR) Platform

A full-stack implementation of the NIR system described in the ToR / SRS: a bilingual (EN/BN)
platform for submitting, evaluating, funding, mentoring, and publicly showcasing innovations
across Bangladesh, with role-based dashboards for all 12 SRS user classes except Public Viewer
(needs no account) and Stakeholder/Partner (no SRS-defined actions beyond public browsing).

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query, next-intl, Zustand, Framer Motion
- **Backend:** NestJS (TypeScript), Prisma ORM, class-validator
- **Database:** PostgreSQL
- **Auth:** JWT access + refresh tokens, RBAC via a `Role[]` claim, argon2 password hashing
- **Monorepo:** npm workspaces (`apps/web`, `apps/api`, `packages/shared`)

## Run with Docker (recommended)

```bash
cp .env.example .env    # edit secrets before any real deployment
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1 (Swagger docs at `/api/docs`)
- Postgres runs in its own container; data persists in the `postgres_data` volume.
- On first boot the API container runs `prisma migrate deploy` automatically. Seed the
  database once the containers are up: `docker compose exec api npx ts-node prisma/seed.ts`.

## Run locally without Docker

Requires Node 20+, PostgreSQL 16 reachable locally, and npm workspaces support (npm 9+).

```bash
npm install
npm run build:shared

# apps/api/.env — set DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (see .env.example)
cd apps/api
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run start:dev

# in a second terminal
cd apps/web
# apps/web/.env.local — set NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev
```

## Demo accounts

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
| innovator1@nir.gov.bd / innovator2@nir.gov.bd / innovator3@nir.gov.bd | Innovation Submitter |

Any user can additionally opt into the Investor, Mentor, or Ministry Focal Point role from
their dashboard overview page.

## What's mocked, and why

A handful of integrations are real Bangladesh government or telecom systems this environment
has no credentials for. Each is implemented as a small service with a stable interface so a real
integration can be dropped in without touching callers:

- **NID/Birth Registration & BIN verification** — `apps/api/src/common/services/identity-verification.service.ts` (format-validates and accepts).
- **SMS/Email delivery** — `apps/api/src/notifications/notifications.service.ts` (logs and marks sent).
- **SSO (Google/Apple/Microsoft)** — buttons are present but disabled in the UI; email/password + JWT is fully implemented.

## Component map (SRS → code)

| SRS Component | Backend module | Key frontend routes |
|---|---|---|
| 1. Innovation Submission & Evaluation | `src/innovations`, `src/evaluations` | `/submit`, `/dashboard/innovations`, `/dashboard/evaluations` |
| 2. Funding Matchmaking | `src/funding` | `/dashboard/investor` |
| 3. Repository & Knowledge Management | `src/repository` | `/repository`, `/repository/[slug]`, `/statistics` |
| 4. Communication & CMS | `src/cms` | `/news`, `/resources`, `/dashboard/admin` (content/categories) |
| 5. Performance Monitoring & Reporting | `src/reporting` | `/dashboard/reports` |
| 6. Mentorship & Expert Guidance | `src/mentorship` | `/dashboard/mentor` |
| 7. Innovation Management (pipeline) | `src/pipeline` | `/dashboard/pipeline` |
| 8. Ministry Submission & Annual Reporting | `src/ministries` | `/dashboard/ministry` |
| Reference data (FR-C4.M2.11) | `src/reference-data` | admin categories tab |

## Known simplifications

- Access/refresh tokens are held in the browser (Zustand + localStorage), not httpOnly cookies —
  acceptable for this phase per the "email/password now, SSO later" decision, but worth revisiting
  before a production rollout given XSS exposure.
- File uploads are stored on local disk under `apps/api/uploads` (Docker volume `api_uploads`),
  not object storage — fine for a single-instance deployment, not for horizontal scaling.
- Search is `ILIKE`-based, not full-text (Postgres `tsvector`/GIN) — adequate at seed-data scale,
  worth revisiting at real data volume per the ToR's <2s search NFR.

# Roles & Permissions — NIR Platform

> Extra file (not in the original doc set) — added because the 14-value `Role` enum drives
> guards in the API, `roles` columns in the DB, and nav/gating in the frontend, and having that
> cross-cutting matrix in three separate places invites drift. Update this whenever a role is
> added, renamed, or its permissions change, and cross-check the other three docs still agree
> with it.

## Why 14, not 12

The README and SRS describe **12 user classes**. The `Role` enum in
`apps/api/prisma/schema.prisma` currently has **14 values** — two more than originally scoped:
`PRELIMINARY_REVIEWER` and `AUTHENTICITY_REVIEWER` were split out of what was likely a single
"reviewer" concept during development (see migrations `add_preliminary_reviewer`,
`add_due_diligence_reviewer`, and the same-day rename `rename_due_diligence_to_authenticity_reviewer`
in [DATABASE.md](DATABASE.md#migrations)). Two of the 12 SRS classes need no `Role` value at all:
**Public Viewer** (no account — unauthenticated access) and **Stakeholder/Partner** (no
SRS-defined actions beyond public browsing).

## Role matrix

| Role | Demo account | Dashboard route | Primary API guard groups | Notes |
|---|---|---|---|---|
| `INNOVATION_SUBMITTER` | innovator1/2/3@nir.gov.bd | `/dashboard/innovations` | `innovations` (own records) | Granted to every self-registered user automatically |
| `INSTITUTIONAL_COORDINATOR` | coordinator@nir.gov.bd | `/dashboard/moderation` | `innovations` moderation queue, `evaluations` panel assignment, `funding` EOI/agreements | Also appears in `pipeline` class-level roles. Sole owner of the "Moderation" sidebar link — it was removed from Platform Admin's nav (see Notes on `PLATFORM_ADMIN` below) |
| `EXPERT_EVALUATOR` | evaluator@nir.gov.bd, evaluator2/3/4@nir.gov.bd | `/dashboard/evaluations` | `evaluations` (scoring), `funding` referrals, `mentorship` matches | Specialization tracked via `User.evaluatorCategoryIds`; 4 seeded accounts so month-wise demo shortlist history has enough unique (innovation, evaluator) pairs — see [ROADMAP.md](ROADMAP.md) |
| `PRELIMINARY_REVIEWER` | preliminary@nir.gov.bd | `/dashboard/preliminary-review` | `innovations` preliminary-review-queue, `review-comments` | Specialization via `User.preliminaryReviewerCategoryIds` |
| `AUTHENTICITY_REVIEWER` | authenticity@nir.gov.bd | `/dashboard/authenticity-review` | `innovations` authenticity-review-queue, `review-comments` | Specialization via `User.authenticityReviewerCategoryIds`; renamed from "Due Diligence Reviewer" |
| `INVESTOR` | investor@nir.gov.bd | `/dashboard/investor` | `funding` (EOI, referrals-received) | Self-service opt-in role; sign-up form optionally collects `binNumber` + `sectorInterestIds` too |
| `MENTOR` | mentor@nir.gov.bd | `/dashboard/mentor` | `mentorship` (matches, sessions, activity logs) | Self-service opt-in role; sign-up form optionally collects `bio` + `availability` + `expertiseTagIds` too |
| `MINISTRY_FOCAL_POINT` | ministry@nir.gov.bd | `/dashboard/ministry` | `ministries` (submissions, reports) | Self-service opt-in role; tied to one `Ministry`; sign-up form optionally collects a `title` too |
| `INNOVATION_MANAGER` | manager@nir.gov.bd | `/dashboard/pipeline` | `pipeline` (class-level), `funding` disbursements, `reporting` fund-utilization | |
| `POLICY_OBSERVER` | policy@nir.gov.bd | `/dashboard/reports` | `reporting` (kpis, analytics, export), `ministries` validation | Read-heavy / oversight role |
| `PLATFORM_ADMIN` | admin@nir.gov.bd | `/dashboard/admin`, `/dashboard/admin/evaluations` (+ `/dashboard/admin/evaluations/:innovationId` detail/approval page), `/dashboard/admin/approvals`, `/dashboard/admin/repository` | almost everything — CMS CRUD, user management, reference data, `innovations` Recognition/Mentor/Fund approval (`PATCH /innovations/:id/approval`), Repository Management (publish/unpublish, media replace/remove, activity log — `GET/PATCH /innovations/admin/*`, `:id/activity-log`, `:id/attachments/:attachmentId`) | The de facto superuser role in practice. Sidebar no longer shows "Moderation" for this role (Institutional Coordinator only) even though the backend guard still permits `PLATFORM_ADMIN` on the moderation-queue endpoints — a deliberate nav-only change, not an access revocation |
| `SYSTEM_ADMIN` | admin@nir.gov.bd (holds both) | `/dashboard/admin`, `/dashboard/admin/repository` | user management, some reporting, `innovations` Recognition/Mentor/Fund approval (shares the guard with `PLATFORM_ADMIN`), Repository Management (shares the same guard as `PLATFORM_ADMIN`, added 2026-08-17 — also newly added to the generic `PATCH /innovations/:id/status` guard alongside it, closing a prior gap where `SYSTEM_ADMIN` alone couldn't use that endpoint) | Narrower than `PLATFORM_ADMIN` in current guard usage — mostly overlaps it |
| `PUBLIC_VIEWER` | *(default for new `User` rows, not really "used")* | none | none — this is the *absence* of a real role | Also the schema default for `User.roles` |
| `STAKEHOLDER_PARTNER` | stakeholder@nir.gov.bd | none | none | No SRS-defined actions beyond public browsing — this account exists purely so the role has a working demo login |

## How permissions are actually enforced

Permissions are **not** stored as a permission list — they're implicit in which `@Roles(...)`
decorators guard which NestJS routes (full detail in [API.md](API.md)), plus which nav items each
role sees in `dashboard-shell.tsx`'s `NAV_ITEMS` (frontend gating is convenience, not security —
the real enforcement is always server-side via `RolesGuard`). A user can hold **multiple roles**
simultaneously (`Role[]` on `User`), which is how the self-service Investor/Mentor/Ministry roles
stack on top of the base `INNOVATION_SUBMITTER` role.

When adding a new role or changing what one can do:
1. Update the `Role` enum in `schema.prisma` (+ migration) and `packages/shared/src/enums.ts`.
2. Update the relevant `@Roles(...)` decorators in `apps/api/src/**/*.controller.ts`.
3. Update `NAV_ITEMS` / `ROLE_CARDS` in the frontend (`dashboard-shell.tsx`, `dashboard/page.tsx`).
4. Update this table, and the role's row in [API.md](API.md) if its guarded endpoints changed.

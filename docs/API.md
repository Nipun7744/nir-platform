# API — NIR Platform

> All backend REST surface, auth mechanics, and integration notes. Update whenever an endpoint,
> DTO, guard, or auth flow changes.

## Basics

- Global prefix: **`/api/v1`**. Swagger UI: **`/api/docs`**.
- Global middleware (`apps/api/src/main.ts`): `helmet()`, CORS (`CORS_ORIGIN`, credentials on),
  global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
  transformOptions: { enableImplicitConversion: true } })`.
- Global guards, in order (`APP_GUARD` in `app.module.ts`): `JwtAuthGuard` → `RolesGuard` →
  `ThrottlerGuard` (120 req/min, `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])`).
- Static file serving: `/uploads/*` via `ServeStaticModule`, rooted at `UPLOAD_DIR` (default
  `./uploads`).
- **No global exception filter and no response-envelope interceptor exist.** Errors come back in
  Nest's default shape (`{ statusCode, message, error }`); successful responses are whatever the
  controller returns, unwrapped. Pagination shape is ad hoc per-endpoint
  (`{ items, total, page, pageSize }` where present). Treat this as current state, not a target —
  flag it in [ROADMAP.md](ROADMAP.md) if standardizing it ever becomes a task.

## Auth model

Every route requires a valid JWT **unless** decorated `@Public()`. `@Roles(...Role[])` further
restricts a route to callers holding **at least one** of the listed roles; a route with no
`@Roles` just needs to be authenticated. Decorators live in `apps/api/src/common/decorators/`:

- `@Public()` — read by `JwtAuthGuard`; skips JWT validation entirely for that route/class.
- `@Roles(...roles)` — read by `RolesGuard`; 403s if the caller has none of the listed roles.
- `@CurrentUser()` — param decorator, pulls `{ id, email, roles }` off `request.user`.
- `OptionalJwtAuthGuard` — used with `@Public()` on routes that are viewable anonymously but
  personalized when a token is present (e.g. innovation detail view, feedback submission); never
  throws on a missing/invalid token.

`CommonModule` is `@Global()` and also exports `AuditLogService`, `IdGeneratorService` (IRN /
innovation code generation), `IdentityVerificationService` (mocked NID/BIN check).

### JWT claim shape

```json
{ "sub": "<userId>", "email": "<email>", "roles": ["<Role>", "..."] }
```

Signed with `JWT_ACCESS_SECRET`, TTL from `JWT_ACCESS_TTL` (default `15m`). The **refresh** token
is *not* a JWT — it's `randomBytes(48).toString('hex')`, stored server-side only as a SHA-256
hash (`RefreshToken.tokenHash`, 30-day expiry via `JWT_REFRESH_TTL`); the raw value is returned
to the client once and never persisted in plaintext.

## Auth endpoints (`auth`)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/register` | Self-register | `@Public()` |
| POST | `/auth/login` | Email/password login → token pair | `@Public()` |
| POST | `/auth/refresh` | Rotate refresh token → new pair | `@Public()` |
| POST | `/auth/logout` | Revoke a refresh token (idempotent) | `@Public()` |
| GET | `/auth/me` | Current user's profile | JWT required |

- **`RegisterDto`:** `email`, `password` (min 8), `fullName`, `phone?` (`BD` phone format),
  `role?` (one of `INVESTOR | MENTOR | MINISTRY_FOCAL_POINT`), plus role-specific optional
  fields that `AuthService.register` forwards to the matching profile service — all were already
  supported by `FundingService.registerInvestor` / `MentorshipService.registerMentor` /
  `MinistriesService.registerFocalPoint` (used by their own authenticated `/register` endpoints);
  registration just didn't expose them until this was wired up:
  - if `role===INVESTOR`: `organizationName?`, `binNumber?`, `sectorInterestIds?: string[]`
    (`Category` ids)
  - if `role===MENTOR`: `bio?`, `availability?`, `expertiseTagIds?: string[]` (`Tag` ids)
  - if `role===MINISTRY_FOCAL_POINT`: `ministryId?`, `title?`
  All of the above are optional even when their role is selected — only `ministryId` is
  practically required (the frontend form marks it `required`, but the DTO itself doesn't
  enforce that server-side).
- **Registration never issues tokens.** It creates the `User` with
  `roles: [INNOVATION_SUBMITTER]` and `isActive: false`, plus an `innovatorProfile`, generates an
  IRN, writes a `USER_REGISTERED` audit log entry, sends a `WELCOME` notification, and returns
  `{ pending: true, message: "..." }`. An admin must call `PATCH /users/:id/status` to activate
  the account before `login` will succeed (403 otherwise, with a message that differs for
  "rejected" vs. "pending" — see `User.rejectedAt`).
- **`LoginDto`:** `email`, `password` → on success, updates `lastLoginAt`, writes a `USER_LOGIN`
  audit entry, returns `{ user: <publicUser>, accessToken, refreshToken }` where `publicUser` is
  `{ id, email, fullName, roles, locale }` (no password hash, no phone).
- **`refresh`/`logout`** both operate on the raw refresh token by its SHA-256 hash; `refresh`
  always rotates (revokes the used token, issues a new pair).

## Endpoint reference by module

Base paths below already include `/api/v1`. "Class roles" means every route in that controller
shares one `@Roles(...)` at the class level with no per-route override.

### Users (`/users`)

| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/users/me` | Own profile | any authenticated |
| PATCH | `/users/me` | Update own profile | any authenticated |
| GET | `/users/:id/submitter-profile` | View a submitter's profile | `PRELIMINARY_REVIEWER, AUTHENTICITY_REVIEWER, EXPERT_EVALUATOR, PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/users/evaluators` | List active expert evaluators (`categoryId` filter) | `INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN` |
| GET | `/users` | Paginated/searchable user list | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| PATCH | `/users/:id/roles` | Overwrite a user's roles | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| PATCH | `/users/:id/status` | Activate/deactivate (approve registration) | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| PATCH | `/users/:id/evaluator-profile` | Set evaluator categories | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| PATCH | `/users/:id/preliminary-reviewer-profile` | Set preliminary-reviewer categories | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| PATCH | `/users/:id/authenticity-reviewer-profile` | Set authenticity-reviewer categories | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| PATCH | `/users/:id/reject` | Reject a pending registration | `PLATFORM_ADMIN, SYSTEM_ADMIN` |

### Innovations (`/innovations`)

| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/innovations` | Create draft | authenticated |
| GET | `/innovations/mine` | Caller's own innovations | authenticated |
| GET | `/innovations/moderation-queue` | Moderation queue | `INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN` |
| GET | `/innovations/preliminary-review-queue` | Preliminary review queue (`?reviewStatus=`: any `ReviewStatus`, defaults `UNDER_REVIEW`; the pseudo-status `REVIEWED` — everything this reviewer has already forwarded past `UNDER_REVIEW`; or `REJECTED`, scoped to `rejectedAtStage: PRELIMINARY_REVIEW` for non-admins — see [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation)) | `PRELIMINARY_REVIEWER, PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/authenticity-review-queue` | Authenticity review queue (`?reviewStatus=`: any `ReviewStatus`, defaults `AUTHENTICITY_REVIEW`; the pseudo-status `REVIEWED` — this specific reviewer's own `authenticityReviewedById` shortlists past `AUTHENTICITY_REVIEW`, not just any in their categories; or `REJECTED`, scoped to `rejectedAtStage: AUTHENTICITY_REVIEW` for non-admins) | `AUTHENTICITY_REVIEWER, PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/:idOrSlug` | View one (id or slug) | `@Public()` + `OptionalJwtAuthGuard` |
| PATCH | `/innovations/:id` | Update | authenticated (ownership checked in service) |
| POST | `/innovations/:id/submit` | Submit draft for review | authenticated |
| PATCH | `/innovations/:id/status` | Change review status. `SHORTLISTED -> SELECTED` is technically still a valid transition here (unchanged in `ALLOWED_TRANSITIONS`) but has no UI affordance anymore — see the `POST /evaluations` note below for why. `SELECTED -> APPROVED` is likewise still valid here as a manual fallback (used only when an innovation has no Recognition/Mentor/Fund request at all, so the Admin Evaluations detail page shows no action button) — normally that transition goes through `PATCH /innovations/:id/approval` instead, which records the actual decision. `APPROVED -> PUBLISHED` (the Admin's separate, later publish action) currently has no dedicated UI beyond this generic endpoint (via the Moderation page) | `INSTITUTIONAL_COORDINATOR, INNOVATION_MANAGER, PLATFORM_ADMIN, PRELIMINARY_REVIEWER, AUTHENTICITY_REVIEWER` |
| PATCH | `/innovations/:id/approval` | Set Recognition/Mentor/Fund approval decision + shared approval letter URL (`UpdateApprovalDto`, all fields optional). **`finalize: true`** additionally moves `reviewStatus: SELECTED -> APPROVED` in the same call, atomically with the approval fields — a no-op if the innovation isn't currently `SELECTED` (e.g. already decided). **`APPROVED` is deliberately not the same as `PUBLISHED`** — this call never sets `publishedAt`; publishing remains a fully separate, later action (see the `/innovations/:id/status` row above). Set only by the Admin Evaluations detail page's explicit "Save approval decisions" button; the same endpoint is also called (without `finalize`) for the incidental approval-letter-upload save, which must not approve/finalize. Once `reviewStatus` has left `SELECTED`, the detail page renders this section read-only — no further calls are possible from that UI | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/:id/review-comments` | List review comments | `PRELIMINARY_REVIEWER, AUTHENTICITY_REVIEWER, EXPERT_EVALUATOR, INSTITUTIONAL_COORDINATOR, INNOVATION_MANAGER, PLATFORM_ADMIN, SYSTEM_ADMIN` |
| POST | `/innovations/:id/team` | Add team member | authenticated |
| DELETE | `/innovations/:id/team/:memberId` | Remove team member | authenticated |
| POST | `/innovations/:id/attachments` | Attach file/media record | authenticated |
| DELETE | `/innovations/:id/attachments/:attachmentId` | Remove attachment | authenticated |

### Evaluations (`/evaluations`)

| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/evaluations/panel-assignments` | Assign an evaluation panel | `INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN` |
| GET | `/evaluations/assigned-to-me` | Evaluator's assigned innovations | `EXPERT_EVALUATOR` |
| POST | `/evaluations` | Submit an evaluation score/verdict. `recommendation` is **required** (`SubmitEvaluationDto`, `EvaluationRecommendation`: `SHORTLIST` \| `REJECT` \| `FUND` — only the first two are offered by the evaluator UI now, see below). **Side effect:** if the innovation is still at `reviewStatus: SHORTLISTED` when this is called, `SHORTLIST` moves it straight to `SELECTED` and `REJECT` moves it straight to `REJECTED`, atomically with saving the `Evaluation` row — no separate Admin/Coordinator action updates the status afterward. First evaluator to submit `SHORTLIST`/`REJECT` decides the outcome; a later evaluator's submission on an already-decided innovation still gets recorded but does not re-fire or overwrite the transition (guarded on `reviewStatus` still being `SHORTLISTED` at the time). `FUND` (legacy value, evaluator UI no longer offers it) triggers no transition. See `EvaluationsService.submitEvaluation` and [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules). | `EXPERT_EVALUATOR` |
| POST | `/evaluations/ip-flags` | Flag an IP concern | `EXPERT_EVALUATOR, INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN` |
| GET | `/evaluations/ip-flags` | List all IP flags | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/evaluations/shortlisted` | List evaluations with `recommendation: SHORTLIST` (not filtered by the innovation's current `reviewStatus` — still returns them after the status above has moved on to `SELECTED`/`REJECTED`/etc., which is what backs the Admin Evaluations page's Pending/Reviewed tabs) | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/evaluations/by-innovation/:innovationId` | Evaluations for one innovation | `EXPERT_EVALUATOR, INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN, INNOVATION_MANAGER` |

### Funding — ⚠️ no `/funding` prefix (`FundingController` is `@Controller()`, routes are top-level)

| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/investors/register` | Register as investor | authenticated |
| GET | `/investors` | Public investor directory (`categoryId` filter) | `@Public()` |
| POST | `/investors/referrals` | Evaluator refers innovation to investor | `EXPERT_EVALUATOR` |
| GET | `/investors/referrals/mine` | Investor's received referrals | `INVESTOR` |
| POST | `/eoi` | Create Expression of Interest | `INVESTOR` |
| GET | `/eoi/mine` | Investor's own EOIs | `INVESTOR` |
| GET | `/eoi/by-innovation/:innovationId` | EOIs for an innovation | `INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN, INNOVATION_MANAGER` |
| PATCH | `/eoi/:id/status` | Update EOI status | `INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN` |
| POST | `/funding-agreements` | Create funding agreement | `INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN, INNOVATION_MANAGER` |
| POST | `/fund-disbursements` | Record a disbursement | `INNOVATION_MANAGER, PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/fund-disbursements/by-innovation/:innovationId` | Disbursements for an innovation | `INNOVATION_MANAGER, PLATFORM_ADMIN, SYSTEM_ADMIN, INSTITUTIONAL_COORDINATOR` |

### Mentorship (`/mentors`)

| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/mentors/register` | Register as mentor | authenticated |
| GET | `/mentors` | Public mentor directory (`tagIds` CSV) | `@Public()` |
| POST | `/mentors/matches` | Create mentor↔innovation match | `MENTOR, INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN, EXPERT_EVALUATOR` |
| GET | `/mentors/matches/mine` | Mentor's own matches | `MENTOR` |
| POST | `/mentors/sessions` | Propose a session | `MENTOR` |
| GET | `/mentors/sessions/mine` | Mentor's own sessions | `MENTOR` |
| PATCH | `/mentors/sessions/:id/status` | Update session status | authenticated |
| POST | `/mentors/sessions/:id/feedback` | Submit session feedback | authenticated |
| POST | `/mentors/activity-logs` | Log mentoring activity | `MENTOR` |
| GET | `/mentors/activity-logs/mine` | Mentor's own activity logs | `MENTOR` |

### Pipeline (`/pipeline`) — class roles: `INNOVATION_MANAGER, PLATFORM_ADMIN, INSTITUTIONAL_COORDINATOR`

| Method | Path | Purpose |
|---|---|---|
| GET | `/pipeline/board` | Kanban-style pipeline board |
| POST | `/pipeline/notes` | Add a pipeline note |
| GET | `/pipeline/notes/by-innovation/:innovationId` | Notes for an innovation |
| PATCH | `/pipeline/innovations/:innovationId/stage` | Move innovation to a new stage |

### Ministries (`/ministries`)

| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/ministries/focal-points/register` | Register as ministry focal point | authenticated |
| POST | `/ministries/cycles` | Create a reporting cycle | `PLATFORM_ADMIN` |
| GET | `/ministries/cycles` | List cycles | authenticated |
| GET | `/ministries/cycles/current` | Current cycle | authenticated |
| POST | `/ministries/submissions` | Create submission | `MINISTRY_FOCAL_POINT` |
| GET | `/ministries/submissions/mine` | Focal point's own submissions | `MINISTRY_FOCAL_POINT` |
| PATCH | `/ministries/submissions/:id/submit` | Submit for validation | `MINISTRY_FOCAL_POINT` |
| PATCH | `/ministries/submissions/:id/validate` | Validate a submission | `PLATFORM_ADMIN, POLICY_OBSERVER` |
| GET | `/ministries/:ministryId/report/:cycleId` | Fetch annual report | `MINISTRY_FOCAL_POINT, PLATFORM_ADMIN, POLICY_OBSERVER` |
| POST | `/ministries/:ministryId/report/:cycleId/generate` | Generate annual report | `PLATFORM_ADMIN` |

⚠️ `GET/POST /ministries` (the lookup list, for dropdowns) is also implemented separately in
`LookupsController` (see Reference Data below) — two different controllers own paths under
`/ministries*`. Nest resolves this fine today (no overlapping method+pattern), but be careful
adding new routes on either controller.

### CMS (`cms` module — content, media, notification templates, **and** all "public content"
sub-resources: FAQs, news, challenges, resources, partners, feedback)

**Content items** (`/content`, class default role `PLATFORM_ADMIN`, overridden by `@Public()` where noted):

| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/content/published` | Published content by type | `@Public()` |
| GET | `/content/published/:slug` | Published content by slug | `@Public()` |
| GET | `/content` | Admin list (all statuses) | `PLATFORM_ADMIN` |
| POST | `/content` | Create | `PLATFORM_ADMIN` |
| PATCH | `/content/:id` | Update | `PLATFORM_ADMIN` |
| PATCH | `/content/:id/status` | Change publish status | `PLATFORM_ADMIN` |
| GET | `/content/:id/revisions` | Revision history | `PLATFORM_ADMIN` |

**Media** (`/media`):

| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/media` | Browse media library | `PLATFORM_ADMIN` |
| POST | `/media` | Register metadata for an already-uploaded file | any authenticated |

**Notification templates** (`/notification-templates`, class role `PLATFORM_ADMIN`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/notification-templates` | List templates |
| POST | `/notification-templates` | Upsert by code |
| PATCH | `/notification-templates/:id` | Update |

**Public content** (`PublicContentController`, ⚠️ no `/cms` prefix — top-level paths):

| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/faqs` | Public FAQ list | `@Public()` |
| GET / POST / PATCH / DELETE | `/faqs/admin`, `/faqs`, `/faqs/:id`, `/faqs/:id` | Admin FAQ CRUD | `PLATFORM_ADMIN` |
| GET | `/news` | Public news/events list (`page`, `pageSize`) | `@Public()` |
| GET | `/news/:slug` | Public news item | `@Public()` |
| GET / POST / PATCH / DELETE | `/news/admin`, `/news`, `/news/:id`, `/news/:id` | Admin news CRUD | `PLATFORM_ADMIN` |
| GET | `/challenges`, `/challenges/:slug` | Public challenge list/detail | `@Public()` |
| POST / PATCH / DELETE | `/challenges`, `/challenges/:id`, `/challenges/:id` | Admin challenge CRUD (full edit — every `CreateChallengeDto` field, including previously-set ones, via `PATCH`) | `PLATFORM_ADMIN` |
| GET | `/resources` | Public resources list (`type` filter) | `@Public()` |
| POST / PATCH / DELETE | `/resources`, `/resources/:id`, `/resources/:id` | Admin resource CRUD | `PLATFORM_ADMIN` |
| GET | `/partners` | Public partners list | `@Public()` |
| GET / POST / PATCH / DELETE | `/partners/admin`, `/partners`, `/partners/:id`, `/partners/:id` | Admin partner CRUD | `PLATFORM_ADMIN` |
| POST | `/feedback` | Submit feedback/grievance | `@Public()` + `OptionalJwtAuthGuard` |
| GET / PATCH | `/feedback`, `/feedback/:id/status` | Admin feedback triage | `PLATFORM_ADMIN` |

> **Note:** `apps/api/src/{challenges,partners,news,resources}/` are empty scaffold folders — the
> actual code above lives in `cms/public-content.controller.ts` / `cms/public-content.service.ts`
> / `cms/dto/public-content.dto.ts`. See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#important-decisions).

### Reporting (`/reporting`)

| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/reporting/public-stats` | Public headline stats | `@Public()` |
| GET | `/reporting/public-breakdown` | Public breakdown stats | `@Public()` |
| GET | `/reporting/kpis` | KPI dashboard | `PLATFORM_ADMIN, POLICY_OBSERVER, SYSTEM_ADMIN` |
| GET | `/reporting/fund-utilization` | Fund utilization report | `PLATFORM_ADMIN, POLICY_OBSERVER, INNOVATION_MANAGER` |
| GET | `/reporting/service-analytics` | Service usage analytics | `PLATFORM_ADMIN, POLICY_OBSERVER` |
| GET | `/reporting/export/innovations.csv` | CSV export (streamed via `Response`, `ministryId`/`categoryId` filters) | `PLATFORM_ADMIN, POLICY_OBSERVER, INNOVATION_MANAGER` |

### Reference Data (two controllers)

`/categories`: `GET` (`@Public()`), `POST`/`PATCH /:id` (`PLATFORM_ADMIN`).

`LookupsController`, ⚠️ no prefix:

| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/tags` (`type` filter) | List tags | `@Public()` |
| POST | `/tags` | Create tag | `PLATFORM_ADMIN` |
| GET | `/sdg-tags` | List SDG tags | `@Public()` |
| POST | `/sdg-tags` | Create SDG tag | `PLATFORM_ADMIN` |
| GET | `/regions` | List regions | `@Public()` |
| POST | `/regions` | Create region | `PLATFORM_ADMIN` |
| GET | `/ministries` | List ministries lookup | `@Public()` |
| POST | `/ministries` | Create ministry lookup entry | `PLATFORM_ADMIN` |

### Repository (two controllers)

`RepositoryController` (class-level `@Public()`, base `/repository`): `GET /repository/search`,
`GET /repository/featured` (`limit`), `GET /repository/related/:innovationId` (`limit`).

`SavedSearchesController` (base `/saved-searches`, no `@Roles` — just authenticated):
`GET /saved-searches`, `POST /saved-searches`, `DELETE /saved-searches/:id`.

⚠️ **Known gap:** `DELETE /saved-searches/:id` has no ownership check in the controller/service
(deletes by id alone, no `where: { userId }`) — any authenticated user can delete any saved
search by ID. Tracked in [ROADMAP.md](ROADMAP.md).

### Uploads (`/uploads`)

Single endpoint: `POST /uploads`, `multipart/form-data`, field name `file`. Authenticated, no
role restriction. Accepted MIME types: `image/png|jpeg|webp|gif`, `video/mp4|webm`,
`application/pdf`, Word (`.doc`/`.docx`), PowerPoint (`.ppt`/`.pptx`). Max size **50 MB**. Storage:
disk, `UPLOAD_DIR` env (default `./uploads`), server-generated UUID filenames (client filename
is never trusted). Response: `{ url, originalName, mimeType, sizeBytes }`. No virus scanning
in-app (deferred to a hosting-layer control). Uploading a file and registering it in the media
library are two separate calls: `POST /uploads` then `POST /media`.

### Notifications

`NotificationsModule` is `@Global()`, exports only `NotificationsService` — **there is no REST
surface**. It's injected directly into `AuthService`, CMS services, etc. to dispatch templated
email/SMS (currently mocked — see [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#important-decisions)).

## Integration notes

| Integration | Status | Where |
|---|---|---|
| NID/Birth Registration & BIN verification | Mocked — format-validates and accepts | `common/services/identity-verification.service.ts` |
| SMS/Email delivery | Mocked — logs and marks sent | `notifications/notifications.service.ts` |
| SSO (Google/Apple/Microsoft) | UI present, disabled | `components/auth/sso-buttons.tsx` |

## API changes

Track breaking or notable API changes here as they land (newest first):

- **2026-08-11** — New `PATCH /innovations/:id/approval` (`UpdateApprovalDto`, all fields
  optional: `recognitionApproved`/`recognitionApprovalComment`, `mentorApproved`/
  `mentorApprovalComment`, `fundApproved`/`fundApprovalComment`, `approvalLetterUrl`),
  `PLATFORM_ADMIN`/`SYSTEM_ADMIN` only (`@Roles` + `RolesGuard`, unlike the general-purpose
  `PATCH /innovations/:id` which has no role restriction — kept separate rather than folding
  these onto `UpdateInnovationDto` so a submitter editing their own draft can never set their own
  approval fields). Backs the new "Permission & Approval" section on the admin's new
  single-innovation evaluation page (`/dashboard/admin/evaluations/:innovationId`, new route —
  previously the admin "Evaluations" list only linked out to the public repository detail page,
  with no admin-side single-innovation view at all). Backed by migration
  `20260811100354_add_admin_approval_fields` — see
  [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation).
- **2026-08-10** — `POST /innovations` / `PATCH /innovations/:id` (`CreateInnovationDto`,
  `UpdateInnovationDto`) accept a new optional `recognitionNeeded: boolean`, alongside the existing
  `mentorshipNeeded`/`fundingNeeded` (migration `20260810093247_add_recognition_needed_flag`, see
  [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation)). Non-breaking additive
  change; not yet reflected in the Swagger schema — same as its two siblings, `CreateInnovationDto`
  has no `@ApiProperty()` decorators, so none of the three appear in `/api/docs-json` despite being
  accepted by the `ValidationPipe`.
- **2026-08-09 (4)** — `GET /innovations/authenticity-review-queue?reviewStatus=REVIEWED` now
  scopes to the caller's own `authenticityReviewedById` (non-admins only). Previously it showed
  every forwarded-status innovation in the caller's assigned categories regardless of *which*
  Authenticity Reviewer shortlisted it — since a category can have multiple reviewers, one
  reviewer's "Reviewed" tab was showing other reviewers' work too. Backed by a new
  `Innovation.authenticityReviewedById` column (migration
  `20260809043821_add_innovation_authenticity_reviewed_by`) — see
  [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation).
- **2026-08-09 (3)** — `GET /innovations/preliminary-review-queue` and `.../authenticity-review-
  queue` now scope `reviewStatus=REJECTED` to `rejectedAtStage` matching that stage (non-admins
  only — admins still see every `REJECTED` innovation in scope, unchanged). Previously both
  queues' Rejected tabs showed *every* `REJECTED` innovation in the caller's assigned categories,
  regardless of which stage actually rejected it — so a submission the Authenticity Reviewer never
  reviewed could appear in their own Rejected tab just because the Preliminary Reviewer rejected
  it in a shared category. Backed by a new `Innovation.rejectedAtStage` column (migration
  `20260809043001_add_innovation_rejected_at_stage`) — see
  [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation).
- **2026-08-09 (2)** — `GET /innovations/authenticity-review-queue` accepts the same
  `reviewStatus=REVIEWED` pseudo-status pattern as the preliminary-review queue (see below),
  resolving to `SHORTLISTED|SELECTED|PUBLISHED|ARCHIVED`. Backs the new "Reviewed" tab on
  `/dashboard/authenticity-review` — see [ROADMAP.md](ROADMAP.md#completed).
- **2026-08-09** — `GET /innovations/preliminary-review-queue` accepts a new pseudo-status
  `reviewStatus=REVIEWED` (not a real `ReviewStatus` enum value — handled specially in
  `InnovationsService.findPreliminaryReviewQueue`) that returns everything the caller has already
  forwarded past `UNDER_REVIEW`. Added to back the new "Reviewed" tab on `/dashboard/preliminary-
  review` — see [ROADMAP.md](ROADMAP.md#completed) for the bug this fixed.
- **2026-08-04** — `POST /auth/register` accepts new optional fields: `binNumber`,
  `sectorInterestIds` (Investor), `bio`, `availability`, `expertiseTagIds` (Mentor), `title`
  (Ministry Focal Point). Non-breaking additive change — see `RegisterDto` above.

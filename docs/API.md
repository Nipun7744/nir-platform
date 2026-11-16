# API — NIR Platform

> All backend REST surface, auth mechanics, and integration notes. Update whenever an endpoint,
> DTO, guard, or auth flow changes.

## Basics

- Global prefix: **`/api/v1`**. Swagger UI: **`/api/docs`**.
- Global middleware (`apps/api/src/main.ts`): `helmet()`, CORS (`CORS_ORIGIN`, credentials on),
  global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
  transformOptions: { enableImplicitConversion: true } })`.
- Global guards, in order (`APP_GUARD` in `app.module.ts`): `JwtAuthGuard` → `RolesGuard` →
  `ThrottlerGuard` (120 req/min, `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])`; tighter
  per-route `@Throttle` on `auth/login`, `auth/register` (20/min) and `auth/otp/send` (10/min)).
  Limits are per client IP, which is only correct behind a proxy if `TRUST_PROXY` is set
  (`main.ts` → Express `trust proxy`; see [SETUP.md](SETUP.md#infrastructure-prerequisites)).
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
  personalized when a token is present (e.g. innovation detail view, feedback submission). No
  token means anonymous. **Since 2026-11-15 a token that is sent but invalid/expired gets `401`**
  (it used to be silently downgraded to anonymous, so a reviewer with a lapsed 15-min access token
  got 404 on unpublished submissions and the web client never refreshed). The web client
  (`lib/api-client.ts`) refreshes on 401 and, if the refresh fails, retries once without a token,
  so public pages still load. Other API consumers must not send a stale bearer token to these
  routes.

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
| GET | `/auth/security-config` | CAPTCHA provider + public site key and OTP settings for the sign-in/register pages (2026-11-12) | `@Public()` |
| POST | `/auth/otp/send` | Registration step 1: email/SMS a one-time code (2026-11-12). CAPTCHA required. Throttle 10/min/IP | `@Public()` |
| POST | `/auth/register` | Self-register (step 2; requires the OTP). Throttle 20/min/IP | `@Public()` |
| POST | `/auth/login` | Email/password login → token pair. **CAPTCHA required on every attempt** (2026-11-12). Throttle 20/min/IP | `@Public()` |
| POST | `/auth/refresh` | Rotate refresh token → new pair | `@Public()` |
| POST | `/auth/logout` | Revoke a refresh token (idempotent) | `@Public()` |
| GET | `/auth/me` | Current user's profile | JWT required |

- **CAPTCHA (2026-11-12)** — `CaptchaService` (`apps/api/src/auth/captcha.service.ts`). One server
  check for Cloudflare Turnstile, reCAPTCHA v2 and hCaptcha, which share the same siteverify
  contract. The provider is chosen by `CAPTCHA_PROVIDER`, or `none` to disable. Callers send the
  widget's token as `captchaToken`. Responses: missing token → **400** "Please complete the CAPTCHA
  check."; rejected token → **400** "CAPTCHA verification failed…"; provider unreachable → **503**
  (fails closed). Tokens are single-use, so the frontend resets the widget after every attempt.
  It is checked **before** any DB lookup on both `login` and `otp/send`.
- **`GET /auth/security-config`** →
  `{ captcha: { provider, siteKey }, otp: { channels: ('EMAIL'|'SMS')[], codeLength: 6, ttlSeconds, resendSeconds } }`.
  It never returns secrets. The web app reads CAPTCHA settings from here rather than from
  `NEXT_PUBLIC_*` env vars.
- **`SendOtpDto` (`POST /auth/otp/send`)**: `channel` (`EMAIL`|`SMS`), `email` (required for EMAIL),
  `phone` (required for SMS; a BD mobile in any common spelling, normalized to `+8801XXXXXXXXX`),
  `locale?` (`en`|`bn`, the language of the message), `captchaToken?`. The order of checks is:
  channel enabled (`OTP_CHANNELS`, else 400) → CAPTCHA → address not already registered (**409**;
  phones are matched against `+880…`/`880…`/`01…` spellings because older rows are
  unnormalized) → `OtpService.send`. Per-target limits: **429** within `OTP_RESEND_SECONDS` of the
  previous send (body includes `retryAfterSeconds`), **429** after `OTP_MAX_SENDS_PER_HOUR`. A new
  code supersedes earlier unconsumed ones. Delivery failure → **503**, and the code row is deleted
  so a retry isn't blocked by the cooldown. Response:
  `{ channel, sentTo (masked), expiresInSeconds, resendInSeconds }`.
- **`RegisterDto`:** `email`, `password` (min 8), `fullName`, `phone?` (`BD` phone format; required
  if `otpChannel === SMS`; **now stored normalized** as `+8801XXXXXXXXX` and checked for
  uniqueness → 409), **`otpChannel`** (`EMAIL`|`SMS`) + **`otpCode`** (6 digits), both required
  since 2026-11-12. The code is verified against the email (lower-cased) or the normalized phone
  **before anything is created**: an expired/missing code → 400; a wrong code → 400 "Incorrect
  verification code. N attempts left."; after `OTP_MAX_ATTEMPTS` → 400 "Too many incorrect
  attempts", and the code is dead. Attempts are counted atomically *before* comparing, so parallel
  guesses can't exceed the cap. On success, `emailVerifiedAt` or `phoneVerifiedAt` is set and the
  `USER_REGISTERED` audit entry gets `metadata.verifiedBy`. Then the rest of the existing fields
  apply:
  **Since 2026-11-16 any `role` is rejected with 400 "New accounts are registered as Innovation
  Submitter only."** (checked first, before the OTP is consumed), so every new account is
  Innovation Submitter only. The constant `SELF_SERVICE_ROLES_AT_SIGNUP` in `auth.service.ts`
  (and its twin in the register page) turns the behaviour below back on:
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
- **A verified OTP approves, activates and signs in the new account (since 2026-11-15).** It
  creates the `User` with `roles: [INNOVATION_SUBMITTER]` (+ the chosen self-service role) and
  **`isActive: true`**, plus an `innovatorProfile`, generates an IRN, writes a `USER_REGISTERED`
  audit entry (`metadata.autoActivated: true`), sends a `WELCOME` notification, and returns
  `{ pending: false, message, user: <publicUser>, accessToken, refreshToken }`, the same session
  shape as `login`. There is no admin approval step for self-registration any more. (Before
  2026-11-15 it returned `{ pending: true, message }` with an inactive account. Accounts created
  that way, and seeded `pending*@nir.gov.bd` demo users, still need `PATCH /users/:id/status`;
  `login` still returns 403 for inactive accounts, with different text for "rejected" vs.
  "pending" — see `User.rejectedAt`.)
- **`LoginDto`:** `email`, `password`, `captchaToken?` (enforced in `AuthService.login` whenever a
  provider is configured) → on success, updates `lastLoginAt`, writes a `USER_LOGIN`
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
| POST | `/innovations` | Create draft. Requires an `Innovator` profile, **except** for `PLATFORM_ADMIN`/`SYSTEM_ADMIN` (2026-11-04), who can create one without a profile; no auto "Lead Innovator" team row is added for them (they add the team by name on the manage page) | authenticated |
| GET | `/innovations/mine` | Caller's own innovations | authenticated |
| GET | `/innovations/moderation-queue` | Moderation queue | `INSTITUTIONAL_COORDINATOR, PLATFORM_ADMIN` |
| GET | `/innovations/preliminary-review-queue` | Preliminary review queue (`?reviewStatus=`: any `ReviewStatus`, defaults `UNDER_REVIEW`; the pseudo-status `REVIEWED` — everything this reviewer has already forwarded past `UNDER_REVIEW`; or `REJECTED`, scoped to `rejectedAtStage: PRELIMINARY_REVIEW` for non-admins — see [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation)) | `PRELIMINARY_REVIEWER, PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/authenticity-review-queue` | Authenticity review queue (`?reviewStatus=`: any `ReviewStatus`, defaults `AUTHENTICITY_REVIEW`; the pseudo-status `REVIEWED` — this specific reviewer's own `authenticityReviewedById` shortlists past `AUTHENTICITY_REVIEW`, not just any in their categories; or `REJECTED`, scoped to `rejectedAtStage: AUTHENTICITY_REVIEW` for non-admins) | `AUTHENTICITY_REVIEWER, PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/admin/repository` | **Admin Repository Management** listing (2026-08-17) — with no `?status=` filter, innovations with `reviewStatus` in `APPROVED`/`PUBLISHED`/`UNPUBLISHED` (`ARCHIVED` is deliberately excluded from this default "active repository" view but selectable explicitly via `?status=ARCHIVED` — the only way to find archived innovations again outside the Moderation page). `RepositoryFilterDto`: `status` (`APPROVED`\|`PUBLISHED`\|`UNPUBLISHED`\|`ARCHIVED`), `categoryId`, `q` (matches `titleEn`/`titleBn`/`innovationCode`), `fromDate`/`toDate` (against `publishedAt`), `page`, `pageSize`. Ordered by `publishedAt desc` with `nulls: 'last'` (so never-published `APPROVED` rows sort to the bottom, not the top). Backs `/dashboard/admin/repository`'s publish/unpublish/archive/featured + media management UI | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/admin/activity-log` | All `AuditLog` rows with `entityType: 'Innovation'` (`ActivityLogFilterDto`: optional `entityId`, `page`, `pageSize`), newest first, with `actor` joined. Backs the Repository Management page's "Recent activity" panel | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/:idOrSlug` | View one (id or slug). Response also carries `submittedByAdmin` (2026-11-04): `{fullName, avatarUrl, designation, institution}` of the creating admin when `createdByAdmin` is true, otherwise `null` — the public "Submitted by" card uses it instead of the team's lead innovator | `@Public()` + `OptionalJwtAuthGuard` |
| PATCH | `/innovations/:id` | Update — full `UpdateInnovationDto` (real validation via `PartialType`, not the CMS module's bare-`Partial<>` bypass, see the CMS section's validation note above). The owner can only do this while `reviewStatus` is `DRAFT`/`REJECTED`; a privileged role (`assertOwnerOrAdmin`) can regardless of status | authenticated (ownership checked in service) |
| DELETE | `/innovations/:id` | **New (2026-08-31, R-002) — delete-draft.** Stricter than `PATCH`: only `reviewStatus === 'DRAFT'` is deletable (not `REJECTED` — a rejected submission already has review history worth keeping), for the owner or a privileged role (same `assertOwnerOrAdmin` check as `PATCH`). Hard-deletes the row; every child relation (team, attachments, tags, sdgTags, funding/mentor links) cascades in the schema. Backs the Submitter Dashboard's Delete Draft button (`/dashboard/innovations` list rows and the manage page), gated behind `ConfirmDialog` client-side | authenticated (ownership checked in service) |
| POST | `/innovations/:id/submit` | Submit draft for review | authenticated |
| POST | `/innovations/:id/publish` | **New (2026-11-04) — Admin "Submit & publish".** Moves the caller's **own** `DRAFT` straight to `PUBLISHED` (sets `submittedAt` + `publishedAt`), bypassing the review pipeline and `ALLOWED_TRANSITIONS` (which still has no `DRAFT -> PUBLISHED` edge). 403 if the caller didn't create it (an admin can never publish an innovator's unsubmitted draft), 400 if not `DRAFT`. Writes `INNOVATION_ADMIN_PUBLISHED` with `{from: 'DRAFT', to: 'PUBLISHED'}` | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| PATCH | `/innovations/:id/status` | Change review status. `SHORTLISTED -> SELECTED` is technically still a valid transition here (unchanged in `ALLOWED_TRANSITIONS`) but has no UI affordance anymore — see the `POST /evaluations` note below for why. `SELECTED -> APPROVED` is likewise still valid here as a manual fallback (used only when an innovation has no Recognition/Mentor/Fund request at all, so the Admin Evaluations detail page shows no action button) — normally that transition goes through `PATCH /innovations/:id/approval` instead, which records the actual decision. `APPROVED -> PUBLISHED` (the Admin's separate, later publish action) has no dedicated UI beyond this generic endpoint via the Moderation page and, as of 2026-08-17, the Repository Management page. **`PUBLISHED <-> UNPUBLISHED`** (added 2026-08-17) is the Admin Repository Management module's takedown/restore toggle — same generic endpoint, same audit-log handling, deliberately not exposed on the Moderation page's transition buttons (kept scoped to the dedicated Repository Management UI). **`-> ARCHIVED`** was already reachable from most statuses before this module existed (Moderation page); the Repository Management page now also offers it (with a confirmation dialog) from `APPROVED`/`PUBLISHED`/`UNPUBLISHED`, framed as "remove from the active repository" — note `ARCHIVED`'s only forward transition is still `-> UNDER_REVIEW` (unchanged), so restoring an archived innovation requires going back through the full review pipeline, not a simple un-archive button. **Reviewers (2026-11-12):** a non-senior Preliminary/Authenticity Reviewer acts as the stage the submission is currently in (`UNDER_REVIEW` → `AUTHENTICITY_REVIEW`/`REJECTED`; `AUTHENTICITY_REVIEW` → `SHORTLISTED`/`REJECTED`), within that stage's categories. Holding both roles works; 403 messages say why (wrong stage, wrong target, outside categories). See [ROLES.md](ROLES.md) | `INSTITUTIONAL_COORDINATOR, INNOVATION_MANAGER, PLATFORM_ADMIN, SYSTEM_ADMIN, PRELIMINARY_REVIEWER, AUTHENTICITY_REVIEWER` |
| PATCH | `/innovations/:id/featured` | **New (2026-08-17).** Mark/unmark an innovation as featured (`UpdateFeaturedDto`: `featured: boolean`) — surfaces it in the homepage Featured section and repository `isFeatured` filtering (`GET /repository/featured`, unchanged, already read this field; this is the first admin-facing way to *set* it on an innovation — Challenges have had an equivalent toggle for longer). Independent of `reviewStatus`: can be set before publishing, but has no visible effect until the innovation is actually `PUBLISHED`. Writes `INNOVATION_FEATURED_CHANGED` with `{from, to}`, not routed through the generic `PATCH /innovations/:id` update (which logs no metadata) | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| PATCH | `/innovations/:id/approval` | Set Recognition/Mentor/Fund approval decision + shared approval letter URL (`UpdateApprovalDto`, all fields optional). **`finalize: true`** additionally moves `reviewStatus: SELECTED -> APPROVED` in the same call, atomically with the approval fields — a no-op if the innovation isn't currently `SELECTED` (e.g. already decided). **`APPROVED` is deliberately not the same as `PUBLISHED`** — this call never sets `publishedAt`; publishing remains a fully separate, later action (see the `/innovations/:id/status` row above). Set only by the Admin Evaluations detail page's explicit "Save approval decisions" button; the same endpoint is also called (without `finalize`) for the incidental approval-letter-upload save, which must not approve/finalize. Once `reviewStatus` has left `SELECTED`, the detail page renders this section read-only — no further calls are possible from that UI | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/:id/review-comments` | List review comments | `PRELIMINARY_REVIEWER, AUTHENTICITY_REVIEWER, EXPERT_EVALUATOR, INSTITUTIONAL_COORDINATOR, INNOVATION_MANAGER, PLATFORM_ADMIN, SYSTEM_ADMIN` |
| GET | `/innovations/:id/activity-log` | `AuditLog` history for one innovation (`ActivityLogFilterDto`: `page`, `pageSize`), newest first. Backs the Repository Management page's per-innovation activity panel | `PLATFORM_ADMIN, SYSTEM_ADMIN` |
| POST | `/innovations/:id/team` | Add team member | authenticated |
| DELETE | `/innovations/:id/team/:memberId` | Remove team member | authenticated |
| POST | `/innovations/:id/attachments` | Attach file/media record. Now also writes an `INNOVATION_MEDIA_UPLOADED` audit entry (previously unlogged) | authenticated |
| DELETE | `/innovations/:id/attachments/:attachmentId` | Remove attachment. Now also writes an `INNOVATION_MEDIA_REMOVED` audit entry (previously unlogged) | authenticated |
| PATCH | `/innovations/:id/attachments/:attachmentId` | **New (2026-08-17).** Replace an existing attachment's file in place — same attachment `id`, new `url`/`caption`/`mimeType`/`sizeBytes` (`ReplaceAttachmentDto`). Writes `INNOVATION_MEDIA_REPLACED` with `{previousUrl, newUrl}`. Used by Repository Management's per-photo/video "Replace" control instead of a separate remove+add (which would log two unrelated entries) | authenticated |

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
| GET / POST / PATCH / DELETE | `/news/admin`, `/news`, `/news/:id`, `/news/:id` | Admin news CRUD — `PATCH` is a full edit (any `CreateNewsDto` field) plus the `unpublish: boolean` toggle used separately by the admin panel's Unpublish/Republish button; omitting `unpublish` leaves `publishedAt` untouched, so a plain field edit never changes publish status | `PLATFORM_ADMIN` |
| — | `/challenges/*` | **Moved to the `challenges` module on 2026-11-10** — see [Challenges](#challenges-challenges) below. Paths for the public list/detail and admin CRUD are unchanged. | — |
| GET | `/resources` | Public resources list (`type` filter) | `@Public()` |
| POST / PATCH / DELETE | `/resources`, `/resources/:id`, `/resources/:id` | Admin resource CRUD | `PLATFORM_ADMIN` |
| GET | `/partners` | Public partners list | `@Public()` |
| GET / POST / PATCH / DELETE | `/partners/admin`, `/partners`, `/partners/:id`, `/partners/:id` | Admin partner CRUD | `PLATFORM_ADMIN` |
| POST | `/feedback` | Submit feedback/grievance | `@Public()` + `OptionalJwtAuthGuard` |
| GET / PATCH | `/feedback`, `/feedback/:id/status` | Admin feedback triage | `PLATFORM_ADMIN` |

> **Note:** `apps/api/src/{partners,news,resources}/` are empty scaffold folders (`challenges/` is
> a real module since 2026-11-10) — the
> actual code above lives in `cms/public-content.controller.ts` / `cms/public-content.service.ts`
> / `cms/dto/public-content.dto.ts`. See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#important-decisions).

> **Validation note (2026-08-31):** `news`'s `PATCH` uses a real `UpdateNewsDto` class (all fields
> `@IsOptional()`, plus `unpublish?: boolean`), so it's actually validated by the global
> `ValidationPipe` — an unknown field 400s, a duplicate `slug` 409s (`ConflictException` on Prisma
> `P2002`), and a nonexistent `id` 404s. The sibling `faqs`/`challenges`/`resources`/`partners`
> `PATCH` endpoints still type their body as `Partial<CreateXDto> & {...}`, a bare TS type that the
> pipe silently skips at runtime — see [ROADMAP.md](ROADMAP.md#technical-debt) before relying on
> them for anything validation-sensitive.

### Challenges (`/challenges`)

`ChallengesModule` (`apps/api/src/challenges/`, 2026-11-10). Literal `admin` routes are declared
before `:slug`. Every challenge object returned carries computed `acceptingSubmissions`,
`closedReason` (English, null when accepting), `closedCode` (2026-11-15, one of `NOT_PUBLISHED` /
`INACTIVE` / `SUBMISSIONS_DISABLED` / `NOT_OPEN_YET` / `NO_LONGER_ACCEPTING` / `DEADLINE_PASSED` /
`NOT_CONFIGURED`, null when accepting — the web app translates it) and `formFieldCount`. Bangla
text (2026-11-15): create/update also accept `organizingAgencyBn`, `prizeInfoBn` (blank → null)
and optional `labelBn`/`descriptionBn` (timeline), `questionBn`/`answerBn` (FAQ), `labelBn`
(resources); admin listings also carry
`submissionCount`. Rules for when a challenge accepts submissions: see
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules).

| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/challenges` | Public list — **published only** (was: all), ordered by deadline | `@Public()` |
| GET | `/challenges/:slug` | Public detail. 404 if unpublished, unless the caller is a Platform/System Admin (preview) | `@Public()` + `OptionalJwtAuthGuard` |
| GET | `/challenges/:slug/form` | `{ challenge, fields }` — the dynamic submission form, ordered. Same visibility rule as detail | `@Public()` + `OptionalJwtAuthGuard` |
| POST | `/challenges/:slug/submissions` | Submit to a challenge. Body `{ responses: { [fieldKey]: value } }`. 401 anonymous; 404 unknown/unpublished; 403 not accepting (`message` = `closedReason`) or caller has no `Innovator` profile; 400 `{ message, fieldErrors: { [key]: string } }` on validation failure. Value shapes: text/email/phone/date(`YYYY-MM-DD`)/select/radio → string; number → number or numeric string; checkbox with options → string[]; consent checkbox (no options) → boolean; FILE → `{url, name, mimeType}` from `POST /uploads`; MULTI_FILE → array of those. Unknown keys are dropped. Creates an `Innovation` (`CHALLENGE` channel, `UNDER_REVIEW`, `submittedAt` now, Lead Innovator team row, files as attachments) and writes `INNOVATION_CHALLENGE_SUBMITTED`. Returns `{ id, innovationCode, slug, titleEn, reviewStatus, submittedAt, challenge }` | authenticated |
| GET | `/challenges/admin` | All challenges incl. unpublished, newest first | `PLATFORM_ADMIN` |
| GET | `/challenges/admin/:id` | One challenge + `formFields` (form builder) | `PLATFORM_ADMIN` |
| POST | `/challenges` | Create (`CreateChallengeDto`, now also `isPublished`/`isActive`/`submissionsEnabled`, and — 2026-11-11 — the optional details-page fields listed below the table, plus — 2026-11-16 — `submitButtonLabelEn?`/`submitButtonLabelBn?` (max 40 chars; trimmed, `''` → NULL → default label)). 400 if `submissionsEnabled` without `categoryId`, or unknown category; 409 duplicate slug. Writes `CHALLENGE_CREATED` | `PLATFORM_ADMIN` |
| PATCH | `/challenges/:id` | Partial update — now a real `UpdateChallengeDto` class (was an unvalidated `Partial<>`); `''` clears `startDate`/`deadline`/`categoryId`. Same 400/409 rules. Writes `CHALLENGE_UPDATED` with `{field: {from, to}}` for `isPublished`/`isActive`/`submissionsEnabled`/`status` changes | `PLATFORM_ADMIN` |
| DELETE | `/challenges/:id` | 204. **409 if the challenge has any submissions** (unpublish/deactivate instead). Writes `CHALLENGE_DELETED` | `PLATFORM_ADMIN` |
| PUT | `/challenges/:id/form` | Form builder save — replaces the whole form. Body `{ fields: FormFieldDto[] }` in display order (`id?`, `key?`, `label`, `labelBn?`, `description?`, `descriptionBn?`, `type`, `required?`, `placeholder?`, `placeholderBn?`, `helpText?`, `helpTextBn?`, `options?`, `optionsBn?` (index-aligned; kept paired when blank options are dropped), `acceptedFileTypes?`, `maxFileSizeMb?`, `maxFiles?`, `mapsTo?`). A consent checkbox (CHECKBOX, no options) keeps its `placeholder`/`placeholderBn` as the box text (it was discarded before 2026-11-15). Keys are kept when sent, generated from the label otherwise. 400 with `message: string[]` of human-readable problems (missing label/options, bad key, duplicate key/mapping, unsupported file type, size > 50 MB, mapping on a non-text field, > 60 fields; more than 200 `options`/`optionsBn` per field (`MAX_OPTIONS`, was 100 before 2026-11-16)). Ids are kept only if they already belonged to this challenge. Returns the same shape as `GET /challenges/admin/:id`. Writes `CHALLENGE_FORM_UPDATED` | `PLATFORM_ADMIN` |

**Details-page fields (2026-11-11)** — accepted by both `POST /challenges` and
`PATCH /challenges/:id` (shared `ChallengeDetailsDto` base class), all optional, returned as-is on
every challenge read: `problemStatementEn/Bn`, `eligibilityEn/Bn`, `evaluationCriteriaEn/Bn`,
`prizeDetailsEn/Bn`, `additionalInfoEn/Bn` (≤ 10 000 chars each), `contactName` (≤ 120),
`contactEmail` (must be an email, `''` clears), `contactPhone` (≤ 40), `timelinePhases` (≤ 20 ×
`{label ≤ 120, date?: ISO date or '', description? ≤ 500}`), `faqs` (≤ 30 × `{question ≤ 300,
answer ≤ 3000}`), `resources` (≤ 20 × `{label ≤ 200, url}` — **`url` must start with `http://`,
`https://` or `/uploads/`**, 400 otherwise, because it is rendered as a link). Blank text is stored
as `null`; list items are trimmed; sending a list replaces it (`[]` empties it).

### Submissions (`/submissions`)

| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/submissions` | Submission monitoring across both channels. `SubmissionFilterDto`: `channel` (`GENERAL`\|`CHALLENGE`), `challengeId`, `reviewStatus`, `q` (submitter name/email, title, NIR code — case-insensitive), `fromDate`/`toDate` (on `submittedAt`, `toDate` inclusive), `includeDrafts` (`'true'`; drafts excluded by default), `page`, `pageSize` (≤ 100). Returns `{ items, total, page, pageSize, totalPages }`; each item has `submissionChannel`, `challenge`, `category` and a hand-joined `submittedBy: {id, fullName, email}` | `PLATFORM_ADMIN, SYSTEM_ADMIN` |

### Settings (`/settings`)

| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/settings/submission` | `{ generalSubmissionEnabled }` — the portal reads this to show/hide general "Submit an Innovation" entry points | `@Public()` |
| PATCH | `/settings/submission` | Body `{ generalSubmissionEnabled?: boolean }`. Writes `GENERAL_SUBMISSION_TOGGLED` with `{from, to}` (only when it actually changes) | `PLATFORM_ADMIN, SYSTEM_ADMIN` |

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
is never trusted). Response: `{ url, originalName, mimeType, sizeBytes }`. `originalName` is
re-decoded as UTF-8 (2026-11-15, `readableOriginalName`): multer reads multipart names as latin1,
which garbled Bangla and other non-English names. Any client path is stripped. No virus scanning
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
| SSO (Google/Apple/Microsoft) | Not wired; buttons hidden since 2026-11-16 (`SSO_BUTTONS_VISIBLE`) | `components/auth/sso-buttons.tsx` |

## API changes

Track breaking or notable API changes here as they land (newest first):

- **2026-11-12** — Registration OTP + login CAPTCHA. **Breaking:** `POST /auth/register` now
  requires `otpChannel` + `otpCode` from a prior `POST /auth/otp/send` (new). `POST /auth/login`
  requires `captchaToken` whenever `CAPTCHA_PROVIDER` isn't `none`, and any script or client that
  logs in through the API must now send one (the e2e suites send Turnstile's dummy test token). New
  `GET /auth/security-config`. New env vars, required in production: see
  [SETUP.md](SETUP.md#registration-otp--login-captcha--prerequisites-and-configuration).
  Migration `20261112044745_registration_otp`.

- **2026-11-11** — `POST /challenges` / `PATCH /challenges/:id` accept the optional details-page
  fields (see the Challenges section); every challenge response now includes them. Additive,
  non-breaking. Migration `20261111104946_challenge_detail_sections`.

- **2026-11-10** — Admin-controlled general submission + challenge-based submission:
  - New `ChallengesModule` owns `/challenges/*` (moved from `cms`). **Behaviour change:**
    `GET /challenges` now returns published challenges only (admins use the new
    `GET /challenges/admin`); `DELETE /challenges/:id` returns 204 (was the deleted row) and
    409s when submissions exist; `PATCH /challenges/:id` is now validated.
  - New: `GET /challenges/:slug/form`, `POST /challenges/:slug/submissions`,
    `GET /challenges/admin[/:id]`, `PUT /challenges/:id/form`, `GET /submissions`,
    `GET/PATCH /settings/submission`.
  - `POST /innovations` and `POST /innovations/:id/submit` (GENERAL draft) now 403 when general
    submission is switched off (admins exempt); `POST /innovations/:id/submit` on a CHALLENGE
    innovation 403s unless its challenge is accepting.
  - Innovation detail/queue responses (`DETAIL_INCLUDE`) now include `challenge: {id, slug,
    titleEn}` plus the scalar `submissionChannel`/`challengeId`/`challengeResponses`.
    `GET /innovations/:idOrSlug` returns `challengeResponses: null` unless the viewer is the
    submitter or holds a review/admin role.

- **2026-11-04** — `GET /innovations/:idOrSlug` adds `submittedByAdmin` (see table above), backed
  by the new `Innovation.createdByAdmin` column.
- **2026-11-04** — New `POST /innovations/:id/publish` (admin direct publish of own draft), and
  `POST /innovations` no longer rejects `PLATFORM_ADMIN`/`SYSTEM_ADMIN` callers who have no
  `Innovator` profile. See the Innovations table above.

- **2026-08-31 (R-002)** — New `DELETE /innovations/:id` (delete-draft). `reviewStatus === 'DRAFT'`
  only, owner or privileged role. The frontend edit path (`PATCH /innovations/:id` via
  `UpdateInnovationDto`) already existed but had no UI calling it for a general field edit — only
  `use-innovations.ts`'s dead `useUpdateInnovation` hook. Added
  `/dashboard/innovations/[id]/edit` (submitter-facing edit form, reusing the same field set as
  `/submit` via a new shared `InnovationFormFields` component) and Edit/Delete-draft buttons on
  both the Submitter Dashboard list and the manage page. No DTO/validation changes were needed on
  the update side — `UpdateInnovationDto` was already `PartialType(CreateInnovationDto)`, properly
  validated.
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

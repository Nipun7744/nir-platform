# Roadmap — NIR Platform

> Living progress tracker. Update at the end of every session: move finished work to Completed,
> keep Current work accurate, and add anything newly discovered to Known Issues / Technical Debt.

## Completed

- Full JWT access+refresh auth with argon2 hashing, admin-approval-gated registration, RBAC via
  `Role[]` claim (14 roles).
- All 8 SRS components implemented end-to-end (backend module + frontend routes) — see
  [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#features-src-component--code-map).
- Role-based dashboards for all in-scope SRS user classes (10 of 12 — Public Viewer and
  Stakeholder/Partner need none).
- Bilingual (EN/BN) UI via `next-intl`, font-swap approach (Bricolage Grotesque/Instrument Sans
  for EN, Hind Siliguri for BN).
- Prisma schema covering all SRS domains (47 models, 23 enums), 11 migrations applied.
- Seed script with demo accounts for every role.
- Preliminary Reviewer / Authenticity Reviewer review stages added and review-comment history
  (`ReviewComment`) added, separate from the SRS's originally simpler single-review flow.
- Docker Compose path (Postgres + API + web) as the recommended run mode; local no-Docker path
  documented for this dev machine (see [SETUP.md](SETUP.md)).
- This `docs/` reference set itself (2026-08-04 — see [SESSION_LOG.md](SESSION_LOG.md)).
- Platform Admin dashboard reorganized (2026-08-04): "Moderation" nav link scoped to Institutional
  Coordinator only; Designation/Institution made read-only for admins (self-service via
  `/dashboard/profile` only); the Evaluations tab moved out of `/dashboard/admin` into its own
  `/dashboard/admin/evaluations` page, merged shortlist + IP-flag status into one list grouped by
  month; "Approvals" renamed to "User Approvals" in the sidebar.
- Demo data expanded significantly (2026-08-04, all in `apps/api/prisma/seed.ts`): 3 more Expert
  Evaluator accounts, 4 more lightweight demo innovations, 15 shortlisted evaluations spread
  across May–Aug 2026 with 3 IP advisory flags; 11 pending registrations covering nearly every
  role for the User Approvals demo queue; standalone active demo accounts for Preliminary
  Reviewer, Authenticity Reviewer, and Stakeholder/Partner (previously unrepresented among active
  seeded accounts).
- Sign-up form (`/register`) now shows role-specific optional fields once a role is picked
  (Investor: BIN number, sector interest; Mentor: bio, availability, expertise tags; Ministry
  Focal Point: designation) — backend `RegisterDto`/`AuthService.register` extended to forward
  them to the already-capable profile services. See [API.md](API.md#api-changes).
- Sign-in page's demo-accounts note replaced with a full scrollable list of all 17 seeded
  accounts (role + email), sourced from a `DEMO_ACCOUNTS` constant in the page component.

- **Fixed (2026-08-09): Preliminary Reviewer's "Shortlist" button was completely broken.** It sent
  `reviewStatus: 'SHORTLISTED'` directly, but the backend only ever allowed Preliminary Reviewers
  to move `UNDER_REVIEW → AUTHENTICITY_REVIEW` or `REJECTED` (`SHORTLISTED` is reserved for the
  Authenticity Reviewer's own action one stage later) — so every click 403'd server-side and
  nothing moved anywhere. Fixed the button to send `AUTHENTICITY_REVIEW`; also added a "Reviewed"
  tab to `/dashboard/preliminary-review` (backed by a new `reviewStatus=REVIEWED` pseudo-status on
  the queue endpoint, see [API.md](API.md#api-changes)) so reviewers can see what they've already
  forwarded instead of it just disappearing from view. Verified end-to-end against the live DB
  (forwarded a real seeded innovation, confirmed it left the Pending queue, appeared in the new
  Reviewed tab and in the Authenticity Reviewer's queue, and that team/attachments/tags/comment
  history survived) then reverted the test mutation.
- **(2026-08-09, session 2) Authenticity Review brought up to the same standard.** The
  Authenticity Reviewer's Shortlist button (`AUTHENTICITY_REVIEW → SHORTLISTED`) was already
  valid against the backend's role guard, unlike the Preliminary Review bug above — no transition
  fix was needed there. What was missing: (1) the "Authenticator Notes" textarea initialized from
  `innovation.reviewRemarks`, which by the time an item reaches Authenticity Review already holds
  the *Preliminary* Reviewer's note — so it silently pre-filled the Authenticator's field with
  someone else's text instead of starting empty; fixed to always start empty, with a more specific
  placeholder. (2) No "Reviewed" tab existed, so shortlisted innovations just disappeared from the
  Authenticator's view — added one, backed by the same `reviewStatus=REVIEWED` pseudo-status
  pattern on `GET /innovations/authenticity-review-queue` (see [API.md](API.md#api-changes)).
  Verified end-to-end against the live DB as the actual `authenticity@nir.gov.bd` demo account:
  shortlisted a real seeded innovation, confirmed it left Pending, appeared exactly once in
  Reviewed with its own notes, became visible to `EXPERT_EVALUATOR` viewers (per
  `findOneForViewer`'s `evaluatorVisibleStatuses`), and that team/attachments/tags/`innovationCode`
  were untouched — then reverted the test mutation. Also found and fixed a stale `ROADMAP.md` note
  from the previous session claiming the seeded `authenticity@nir.gov.bd` account had no assigned
  categories — that's since been corrected (categories now match `preliminary@nir.gov.bd`'s),
  removed from Known Issues below as resolved.
- **(2026-08-09, session 3) Fixed cross-stage leakage in the Rejected tabs.** User noticed the
  Authenticity Reviewer's Rejected tab showed an innovation ("Test Innovation") that had actually
  been rejected by the *Preliminary* Reviewer, not them. Root cause: both queue endpoints filtered
  Rejected purely on `reviewStatus: REJECTED` + category match, with no concept of which stage did
  the rejecting — so any `REJECTED` innovation in a reviewer's assigned categories showed up in
  *both* dashboards' Rejected tabs regardless of who actually rejected it. Added a new
  `Innovation.rejectedAtStage` column (migration `20260809043001_add_innovation_rejected_at_stage`,
  see [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation)), set by
  `InnovationsService.updateStatus` from the *from*-status on every transition into `REJECTED`
  (derived from state, not actor role, so a senior override is still attributed correctly) and
  cleared on any transition away from it. Both queue methods now filter `REJECTED` by
  `rejectedAtStage` matching their own stage for non-admins (admins still see everything,
  unchanged) — see [API.md](API.md#api-changes). Backfilled the one pre-existing `REJECTED`
  innovation from its audit-log history. Verified both directions end-to-end against the live DB:
  confirmed the existing Preliminary-stage rejection disappeared from Authenticity's Rejected tab
  but stayed in Preliminary's, then rejected a fresh innovation from `AUTHENTICITY_REVIEW` and
  confirmed the reverse (present in Authenticity's Rejected, absent from Preliminary's) — then
  reverted both test mutations.
- **(2026-08-09, session 4) Scoped the Authenticity Reviewer's "Reviewed" tab to that specific
  reviewer.** It was showing every shortlisted innovation in the caller's assigned categories,
  regardless of which Authenticity Reviewer actually shortlisted it — since a category can have
  multiple reviewers assigned (confirmed live: `authenticity@nir.gov.bd` and
  `authenticity-test@nir.gov.bd` share categories, and each was seeing the other's shortlists).
  Added `Innovation.authenticityReviewedById` (migration
  `20260809043821_add_innovation_authenticity_reviewed_by`), set on the
  `AUTHENTICITY_REVIEW → SHORTLISTED` transition and preserved through later `SELECTED`/`PUBLISHED`
  moves so attribution survives past this stage — see
  [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation). Backfilled 6 of the 13
  pre-existing forwarded-status innovations from genuine `SHORTLISTED` audit-log entries (the
  remaining 7 were seeded directly at `SHORTLISTED`/`PUBLISHED` with no real reviewer action behind
  them, so were deliberately left `null` rather than falsely attributed). `findAuthenticityReviewQueue`'s
  `REVIEWED` branch now filters by `authenticityReviewedById` for non-admins (admins unaffected, same
  bypass pattern as `rejectedAtStage`). Verified end-to-end against the live DB from both accounts'
  perspectives: `authenticity@nir.gov.bd` now sees only their 1 shortlist, `authenticity-test@nir.gov.bd`
  sees only their 3, and admin still sees all 13 — no test mutation needed this time since existing
  live data was sufficient to verify.
- **(2026-08-09, session 5) Full pipeline E2E test executed and passed 13/13** — Innovation
  Submission → Preliminary Review → Authenticity Review → evaluator panel assignment → Expert
  Evaluation with a Shortlist recommendation → confirmed in Platform Admin's "Shortlisted by
  evaluators" view, with a final data-integrity check across the whole chain. Doubled as
  regression coverage for the three fixes above (sessions 1–4), all still correct. See
  [SESSION_LOG.md](SESSION_LOG.md) for the full write-up and the published test-report Artifact.

- **(2026-08-10, session 7) Innovation Submission form and detail pages brought closer to feature-
  complete.** Several related changes in one session:
  - Added a third "Recognition needed" support-request flag alongside the existing "Mentorship
    needed"/"Funding needed", full stack (`Innovation.recognitionNeeded`, migration
    `20260810093247_add_recognition_needed_flag`, `CreateInnovationDto`, submit form, and the
    "Support requested" badge row on the evaluator's innovation-detail view) — see
    [API.md](API.md#api-changes) and [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation).
    Checkbox order was later changed to Recognition → Mentorship → Funding per user request.
  - Added a required **Terms & Conditions** checkbox to the submission form; "Save draft &
    continue" stays disabled until it's checked. Client-side only — not persisted to the
    `Innovation` record, since acceptance isn't part of the submitted data model.
  - **Fixed a bug** in the "Innovation team" add-member UI
    (`dashboard/innovations/[id]/page.tsx`): the Role input's `value` was bound to a field that
    defaulted to the literal string `'Team Member'`, so it rendered as real (non-placeholder) text
    and never cleared after clicking "Add" the way the Name field did. Now starts empty, shows
    `"Team Member"` as an actual placeholder, and both fields reset after a successful add (default
    role still applied at submit time if left blank).
  - **The innovator's own "Manage Innovation" page** (`dashboard/innovations/[id]/page.tsx`)
    previously only showed title/summary/attachments/team after submission — everything else typed
    into the form (problem statement, proposed solution, objectives, key features, target
    beneficiaries, impact, category, type, stage, TRL, IP status, funding source, region,
    organization, support-requested flags) was invisible post-submit. Brought this page up to the
    same read-only display already used on the evaluator's view of an innovation, so submitters can
    now see everything they submitted.
  - **Public repository detail page** (`components/repository/innovation-detail.tsx`) now shows
    Preliminary/Authenticity reviewer notes and Expert Evaluator scores/comments, but only to
    viewers with `Role.PLATFORM_ADMIN` (confirmed with the user before implementing, since the page
    itself is public/unauthenticated) — see [UI_GUIDELINES.md](UI_GUIDELINES.md#reusable-patterns).
  - See [SESSION_LOG.md](SESSION_LOG.md) for the full session write-up.

- **(2026-08-11, session 8) Admin "Permission & Approval" (Recognition/Mentor/Fund) on a new
  admin single-innovation page.** Previously the admin "Evaluations" list
  (`/dashboard/admin/evaluations`) only linked out to the public, unauthenticated repository
  detail page — there was no admin-side single-innovation view at all. Added
  `/dashboard/admin/evaluations/[innovationId]`, modeled on the Expert Evaluator's own
  per-innovation page, plus a new bottom section letting an admin approve whichever of
  Recognition/Mentor/Fund the innovator requested (checkbox + comments each, admin-only via a new
  `PATCH /innovations/:id/approval`), with one shared approval-letter upload/view/replace covering
  all three. New `Innovation` columns (`recognitionApproved`/`mentorApproved`/`fundApproved` +
  matching comment fields + `approvalLetterUrl`, migration `20260811100354_add_admin_approval_fields`).
  Verified end-to-end against the live DB (a real seeded innovation, all three support types
  requested) as `admin@nir.gov.bd`, confirmed a non-admin gets 403, then reverted the test
  mutation. See [SESSION_LOG.md](SESSION_LOG.md) for the full write-up.

- **(2026-08-11, session 9) Admin Evaluation page: Pending/Reviewed tabs, Date Range filter,
  Category filter.** Added to `/dashboard/admin/evaluations`'s "Shortlisted by evaluators" list,
  all client-side (no backend/DB changes — the existing `GET /evaluations/shortlisted` payload
  already carries everything needed). "Pending" vs "Reviewed" reuses `Innovation.reviewStatus`
  (`SHORTLISTED` = Pending the Admin's final call; `SELECTED`/`REJECTED`/`PUBLISHED`/`ARCHIVED` =
  Reviewed) rather than introducing any new status field — confirmed this definition with the user
  before implementing, since the codebase had no prior concept of "Admin-reviewed" to reuse
  directly. Date Range uses native `<input type="date">` (From/To, no library, no time component),
  filtered inclusively against `Evaluation.submittedAt` (same field the list already groups by
  month) using local-time day boundaries. Category filter reuses the existing `useCategories()` /
  `GET /categories`. All three combine via AND (tab ∧ category ∧ date range), plus a "Reset
  filters" button that clears date/category without changing tabs. The secondary "Other IP flags
  (not shortlisted)" panel below the list is intentionally left unaffected by the new tabs/filters
  (confirmed with the user) — it's a distinct, always-unfiltered safety-net list, not part of "the
  evaluation list." No pagination existed on this page before or after (long lists here are
  grouped by month, not paginated — see [UI_GUIDELINES.md](UI_GUIDELINES.md#reusable-patterns)).
  Verified the filter logic against live seeded data (7 Pending / 13 Reviewed / 2 orphaned
  `UNDER_REVIEW` items matching neither tab by design; category and inclusive date-boundary
  narrowing both checked); `tsc --noEmit` clean; could not visually verify the rendered UI in a
  browser (no browser-automation tool available in this environment) — flagged to the user rather
  than assumed. See [SESSION_LOG.md](SESSION_LOG.md).

- **Fixed (2026-08-11, session 10): Expert Evaluator comments missing from the admin
  single-innovation page.** `EvaluationsSummaryCard` (session 8's
  `dashboard/admin/evaluations/[innovationId]/page.tsx`) rendered each evaluator's name,
  recommendation, and total score, but never rendered `evaluation.comments` even though the API
  already returned it — a one-line JSX gap, caught by the user, not a backend issue. See
  [SESSION_LOG.md](SESSION_LOG.md).
- **(2026-08-12, session 11) Site-wide "running challenge" popup**, plus the Challenges admin tab
  brought up to full CRUD: featured/priority flag (single-featured invariant enforced
  server-side), start/end timeline display, and an actual **Edit** action (previously only
  `status` and delete existed post-creation). Migration
  `20260812042528_add_challenge_featured_timeline`. See [SESSION_LOG.md](SESSION_LOG.md).
- **(2026-08-12, session 12) Challenge banner image** — `Challenge.bannerImageUrl` (migration
  `20260812043826_add_challenge_banner_image`), reusing the existing `ImageUploadField` (now
  generalized with a `placeholder` prop) across the homepage banner, the running-challenge popup,
  the `/challenges` list, and the `/challenges/[slug]` detail hero. See
  [SESSION_LOG.md](SESSION_LOG.md).
- **(2026-08-12, sessions 13–17) Innovation review pipeline overhauled end-to-end** — what
  started as a submitter-facing status relabel grew, across five sessions of user-driven
  correction, into real changes to who triggers each transition and when. Final shape:
  - Submitter's "My Innovations" list/detail show three distinct, purpose-built labels/colors
    instead of the raw internal stage names: **Longlisted** (passed Primary/Preliminary Reviewer),
    **Midlisted** (passed Authenticity Reviewer), **Shortlisted** (passed Expert Evaluation).
    Reviewer pass-buttons renamed to match ("Shortlist" → "Longlist" / "Midlist" on the respective
    review pages).
  - The Expert Evaluator's own **Shortlist**/**Reject** decision (two direct-action buttons,
    replacing a three-option dropdown) now **automatically** transitions the innovation's status
    server-side, atomically with saving their score (`EvaluationsService.submitEvaluation`) — no
    admin follow-up step, and no generic "Move to SELECTED" button exists anywhere. First
    evaluator to decide wins; a later evaluator's vote on an already-decided innovation is
    recorded but can't override it.
  - Added a new `APPROVED` status (migration `20260812101124_add_innovation_approved_status`),
    inserted between `SELECTED` and `PUBLISHED`: the Admin's "Save approval decisions" action
    (Recognition/Mentor/Fund sign-off) moves an innovation here — **deliberately not the same
    event as publication**, which remains separate and later (currently Moderation-page-only, no
    dedicated "Publish" UI yet). Once decided, the approval section becomes fully read-only — no
    re-entry, no resubmission.
  - The Admin Evaluations page's Pending/Reviewed tabs were fixed twice in this arc: once to
    recognize the evaluator's now-automatic `SELECTED` transition as "Pending" at all (session 15,
    a same-day regression from session 14), and once more to reclassify `APPROVED` as "Reviewed"
    once that became a distinct status (session 17).
  - See [SESSION_LOG.md](SESSION_LOG.md) for the full five-session write-up, including the
    live-data verification performed at each step and the specific design corrections the user
    made along the way (this is worth reading in full before touching this pipeline again — the
    final design is not the first, second, or third thing that was built).

- **(2026-08-13, session 18) Pushed to GitHub, deployed to production, cleaned up test data.**
  Initialized git (repo had none before), added `.gitignore`, pushed to
  https://github.com/Nipun7744/nir-platform (public). Deleted 23 manually-created test innovations
  and 9 test users from the local dev DB — including the `test118`/`test119` items flagged in the
  Known Issues entry above, now resolved/removed rather than fixed in place (2 accounts named
  `*-test@nir.gov.bd` were deliberately kept — real `ReviewComment` history on a genuine
  innovation, see [SESSION_LOG.md](SESSION_LOG.md)). Deployed `apps/web` to Vercel and
  `apps/api` + PostgreSQL to Railway, wired together (`NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`), fresh
  JWT secrets generated for production, uploads given a persistent Railway volume, seeded, and
  verified end-to-end (login, CORS, real data fetched from the live API). Full details:
  [SETUP.md § Production Deployment](SETUP.md#production-deployment).

## Current work

*(nothing in progress as of this update — session 18's deployment work above is the most recent
completed work)*

## Upcoming

- No dated milestones are recorded anywhere in the repo or `Documents/`. If a delivery schedule
  exists, add it here — for now this section stays a backlog, not a timeline.
- Backlog candidates worth scoping (pull from Known Issues / Technical Debt below as they're
  picked up).

## Known issues

- **No dedicated "Publish" UI exists.** `APPROVED -> PUBLISHED` (the Admin's actual final
  publication decision, deliberately separate from the `APPROVED` approval step — see
  [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules)) is currently only reachable via the
  Moderation page's generic per-status "Move to X" button, same as several other transitions. A
  dedicated action on the Admin Evaluations detail page (mirroring how "Save approval decisions"
  works today) would be a natural follow-up if requested.
- **`EvaluationRecommendation.FUND`** is still a valid enum value (existing data may use it) but
  the Expert Evaluator UI no longer offers it — the decision is binary (Shortlist/Reject) as of
  session 14. If a "recommend for funding" concept is needed again, it needs its own explicit UI,
  not a slot in that binary decision.
- **Preliminary Review's "Reviewed" tab has the same category-only scoping gap that Authenticity
  Review's just had fixed** (see Completed above) — `findPreliminaryReviewQueue`'s `REVIEWED`
  branch shows every forwarded innovation in the caller's assigned categories, not just the ones
  *this* Preliminary Reviewer personally forwarded. Not yet observable in the current demo data
  (only one active `preliminary@nir.gov.bd` account exists), but would need the same
  `preliminaryReviewedById`-style fix if a second Preliminary Reviewer account is ever added to a
  shared category. Left unfixed since not requested and not currently reproducible.
- **`DELETE /saved-searches/:id` has no ownership check** — any authenticated user can delete any
  other user's saved search by ID (`repository/saved-searches.controller.ts`). Low-severity data
  loss, not a data-exposure bug, but should be fixed (`where: { id, userId }`).
- **No global API error envelope or response wrapper** — errors use Nest's default shape,
  pagination shape is ad hoc per-endpoint. Not wrong, just inconsistent; worth a pass if the API
  ever grows external consumers.
- **Two color palettes coexist** in `tailwind.config.ts` (generic `ink/brand/sun/clay/paper` vs.
  the actually-used NIR flat set) — see [UI_GUIDELINES.md](UI_GUIDELINES.md#color-palette).
  Consolidate or explicitly retire one.
- **`darkMode: ['class']` is configured but nothing implements a theme toggle** — either wire it
  up or remove the config to avoid implying a feature that doesn't exist.
- **Route-naming quirks**: `FundingController` and `LookupsController` have no path prefix
  (routes appear top-level, e.g. `/investors`, `/tags`, not `/funding/investors`), and
  `LookupsController`'s `/ministries` overlaps path-wise with `MinistriesController`'s
  `/ministries/*`. Works today; a trap for anyone adding new routes on either.
- **Empty scaffold directories**: `apps/api/src/{challenges,partners,news,resources}/` contain
  only an empty `dto/` folder each and are not imported anywhere — the real implementation is in
  `cms/public-content.*`. Should be deleted or documented as intentionally reserved.
- **`nest start --watch` broken on this dev machine** (build-cache race) — see
  [SETUP.md](SETUP.md#known-environment-specific-issues-this-machine) for the current workaround.

## Technical debt

- **JWT stored in localStorage, not httpOnly cookies** — accepted tradeoff for this phase, but
  flagged (README, [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#important-decisions)) as needing a
  hardening pass before any production rollout, given XSS exposure.
- **File uploads on local disk, not object storage** — blocks horizontal scaling of the API. In
  production this is a Railway volume (persists across redeploys, unlike the container
  filesystem), but it's still tied to a single instance/region — see
  [SETUP.md](SETUP.md#production-deployment).
- **Search is `ILIKE`, not Postgres full-text (`tsvector`/GIN)** — flagged against the ToR's <2s
  search NFR; fine at seed-data scale, unverified at real data volume.
- **No shared UI component primitives** (`Button`/`Input`/`Card`) — every page hand-rolls its own,
  increasing drift risk as more pages are added. See
  [UI_GUIDELINES.md](UI_GUIDELINES.md#known-gaps).
- **Mocked integrations** (NID/BIN verification, SMS/Email, SSO) are stable-interface stand-ins,
  not implementations — swapping in real providers is deferred, tracked work, not a bug.
- **Resolved (2026-08-17):** the sign-in page's `DEMO_ACCOUNTS` list (previously duplicating the
  demo-accounts table in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#demo-accounts) and
  `apps/api/prisma/seed.ts`) was removed from the sign-in page entirely — see
  [SESSION_LOG.md](SESSION_LOG.md). `PROJECT_CONTEXT.md` is now the only listing.
- **Two near-identical chip-multi-select implementations** (admin specialization-category picker
  in `dashboard/admin/page.tsx`, `ChipSelect` in `register/page.tsx`) — see
  [UI_GUIDELINES.md](UI_GUIDELINES.md#component-inventory-appswebsrccomponents). Worth extracting
  to a shared component if a third use case shows up.
- **16 bulk-imported innovations have inferred category/type/stage, not source-confirmed values**
  (`NIR-2026-000059`–`NIR-2026-000074`, 2026-08-13 import — see
  [SESSION_LOG.md](SESSION_LOG.md#2026-08-13-session-12--local-env-started-bulk-imported-30-innovations-from-external-template)).
  The source spreadsheet rows were missing `Category*`/`Innovation Type*`; the import script
  guessed from title/summary text. Needs a spot-check pass in `/dashboard/admin` before these are
  treated as authoritative.

## Milestones

*(none defined in the repo yet — add them here once a delivery plan exists, rather than inferring
dates from commit/migration timestamps)*

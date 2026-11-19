# Roadmap — NIR Platform

> Living progress tracker. Update at the end of every session: move finished work to Completed,
> keep Current work accurate, and add anything newly discovered to Known Issues / Technical Debt.

## Completed

- **Dynamic contact fields (2026-11-18, session 53)** — "Contact for questions" is fully admin-defined
  (label, type, placeholder, help text, options, validation; en + bn; starts empty), shown in the
  public Contact card. The fixed name/email/phone columns were migrated into it and dropped
  (migration 30, `contactFields`). e2e test added.
- **Configurable challenge details fields (2026-11-18, session 53)** — Platform admin → Challenges →
  Create / Edit: each challenge has its own list of details-page fields with section, label, input
  type (11 types), placeholder, help text, options and validation rules in English + Bangla;
  add / reorder / retype / remove; new challenges start with **no fields** (created dynamically);
  inline validation shared with the API. The five fixed sections
  became fields (content migrated). Public page groups fields by section. Tests:
  `challenge-detail-fields.test.js` (8 unit), `challenge-detail-fields.e2e.test.js` (6).
- **Admin participant export + bulk email/SMS (2026-11-18, session 52)** — `/dashboard/admin/outreach`:
  per-challenge participant list (de-duplicated), .xlsx export (en/bn headings, Bangla data,
  Bangladesh-time dates), bulk email/SMS with placeholders, recipient review, admin OTP
  confirmation, duplicate/idempotency guards, paced background delivery, communication log,
  audit trail. en + bn UI. Tests: `outreach-rules.test.js` (10 unit), `outreach.e2e.test.js` (11).
- **Branded OTP email template (2026-11-18, session 51)** — one responsive, en/bn HTML template for
  every email OTP (registration verification, password reset), purpose-specific copy, logo as
  inline CID image; SMS unchanged. Previewed at desktop/375/320px and received in Gmail (Google
  Workspace). See UI_GUIDELINES.md § OTP email template.
- **Forgot password (2026-11-18, session 50)** — "Forgot password?" on sign-in → reset by
  email or SMS OTP (reusing `OtpService`, CAPTCHA, limits) → new password + confirmation →
  all sessions revoked. en + bn, same auth-form components/accessibility patterns. API e2e suite
  `password-reset.e2e.test.js` (14 tests) + browser walk-through. See API.md § Forgot password.
- **Full end-to-end workflow test (2026-11-16)** — new applicant registered through the UI
  (email OTP) → challenge submission through the UI → preliminary → authenticity → expert
  evaluation → admin approval → publish. Data checked intact at every stage and visibility checked
  per audience. Found and fixed: evaluations accepted before the evaluation stage (see API.md
  `POST /evaluations`), the "sign in to submit" note shown to signed-in users, and the challenge
  form's final button ignoring the custom submit label. Details in SESSION_LOG session 48.

- **GitLab CI/CD removed (2026-11-16)** — `.gitlab-ci.yml`, `deploy/deploy.sh` and `.gitattributes`
  deleted at the user's request. Pushing to GitLab `development` no longer deploys
  dev.challenge.gov.bd; deploys are manual (see [SETUP.md](SETUP.md#deploying-to-devchallengegovbd)).
  The Dockerfiles and `docker-compose.yml` stay, since the server runs the stack with them.
  **Superseded 2026-11-17:** `.gitlab-ci.yml` came back as a build-and-publish pipeline (verify +
  registry images, no deploy), see [SETUP.md § GitLab CI pipeline](SETUP.md#gitlab-ci-pipeline-gitlab-ciyml).
  **2026-11-19:** branch `ci/auto-deploy-dev` restores `deploy/deploy.sh` and the
  deploy/rollback/smoke jobs. It is waiting on a merge and on a Maintainer adding the SSH
  variables; until then deploys are manual.

- **Richer challenge details page (2026-11-11)** — optional problem statement, eligibility,
  timeline phases, evaluation criteria, prize breakdown, resources, FAQ, additional info and
  contact per challenge (EN + optional BN), edited from Platform admin → Challenges; redesigned
  `/challenges/[slug]` with section nav, sticky apply sidebar and mobile apply bar; popup kept as a
  teaser with a days-left badge. **Not yet checked in a browser** (Chrome extension not connected)
  — see [SESSION_LOG.md](SESSION_LOG.md).

- **Admin-controlled general submission + challenge-based submission with a dynamic form
  builder (2026-11-10)** — general-submission on/off switch (`/dashboard/admin/submissions`,
  enforced in the API), per-challenge publish/active/submission switches, per-challenge dynamic
  submission forms (11 field types, required/options/help/placeholder, file type + size limits,
  drag-and-drop ordering, preview) built in Platform admin → Challenges, login-required challenge
  submission page with return-to-challenge after sign-in/registration, submissions entering the
  existing Primary Review pipeline unchanged, and admin submission monitoring with filters. See
  [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules) and [API.md](API.md#challenges-challenges).
- **Admin "Submit & publish" (2026-11-04)** — Platform/System Admins can create an innovation
  (no Innovator profile needed) and publish their own draft directly via
  `POST /innovations/:id/publish`; the public "Submitted by" credits the admin for these (`Innovation.createdByAdmin`). See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules).
- Full JWT access+refresh auth with argon2 hashing, admin-approval-gated registration, RBAC via
  `Role[]` claim (14 roles).
- All 8 SRS components implemented end-to-end (backend module + frontend routes) — see
  [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#features-src-component--code-map).
- Role-based dashboards for all in-scope SRS user classes (10 of 12 — Public Viewer and
  Stakeholder/Partner need none).
- Bilingual (EN/BN) UI via `next-intl`, font-swap approach (Bricolage Grotesque/Instrument Sans
  for EN, Hind Siliguri for BN).
- Prisma schema covering all SRS domains (51 models, 29 enums), 23 migrations applied.
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

- **Fixed (2026-11-12, session 45): Preliminary Reviewer couldn't longlist (forward to Authenticity
  review) or reject** when the account also held `AUTHENTICITY_REVIEWER`. Both role checks ran
  and the authenticity one returned 403 for every `UNDER_REVIEW` item. Now the reviewer acts as the
  submission's current stage (see [ROLES.md](ROLES.md)). The review pages also now show server
  errors instead of failing silently. Regression test: `test/review-workflow.e2e.test.js`.

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

- **(2026-08-17) Admin Repository Management module.** New `UNPUBLISHED` `ReviewStatus` value
  (migration `20260817054146_add_unpublished_review_status`) plus a new `/dashboard/admin/repository`
  page (`PLATFORM_ADMIN`/`SYSTEM_ADMIN` only): publish (`APPROVED`/`UNPUBLISHED` → `PUBLISHED`) or
  unpublish (`PUBLISHED` → `UNPUBLISHED`) any innovation, manage its `PHOTO`/`VIDEO` attachments
  (upload, replace-in-place, remove), and view a full admin activity log per innovation and
  repository-wide — all reusing the existing generic status-transition endpoint and the
  pre-existing (previously read-only-from-code, no API) `AuditLog` table. Also fixed a real gap
  found along the way: `PATCH /innovations/:id/status`'s controller guard was missing
  `SYSTEM_ADMIN` even though the service-level checks already treated it as a senior role
  elsewhere. First confirmation-dialog component in the codebase
  (`components/ui/confirm-dialog.tsx`) — see [UI_GUIDELINES.md](UI_GUIDELINES.md). Full detail:
  [SESSION_LOG.md](SESSION_LOG.md).

- **(2026-08-25) App-wide mobile-responsiveness sweep.** Fixed four recurring bug classes found by
  a scripted Playwright audit (every seeded role × every route × 360/375/768px): CSS Grid
  min-content overflow on bracket-syntax `grid-cols-[…]` two-column layouts, unwrapped
  `shrink-0` action-button clusters, unconstrained native `<select>` width, and untruncated
  attachment-filename links. Zero horizontal overflow anywhere in the app afterward; both existing
  modals re-verified still mobile-safe (no changes needed there — session 25's fix held); desktop
  layout unchanged. Full technical detail in [UI_GUIDELINES.md § Reusable
  patterns](UI_GUIDELINES.md#reusable-patterns), full session write-up in
  [SESSION_LOG.md](SESSION_LOG.md).

- **(2026-08-25, session 28) Fixed a real hero-search-bar overflow the first sweep's audit script
  had missed** — its `document.scrollWidth`-gated check was silently masked by `hero.tsx`'s own
  `overflow-hidden` section and by the site-wide challenge popup's body-scroll-lock. Fixed
  `hero.tsx` (missing `min-w-0` on its grid text column, same pattern as session 27) and one more
  real bug the corrected wider sweep (320px, unconditional per-element scan) caught:
  `/dashboard/investor`'s "Express interest" row. See
  [UI_GUIDELINES.md § Reusable patterns](UI_GUIDELINES.md#reusable-patterns) for why the original
  check missed these and what to do differently in any future automated mobile-overflow sweep.

- **(2026-11-12, session 44) Registration OTP (email or SMS) + CAPTCHA on every login.** Pluggable
  CAPTCHA (Turnstile/reCAPTCHA v2/hCaptcha), real SMTP email and a generic HTTP SMS client
  (`apps/api/src/messaging/`), `OtpCode` table, a two-step register page, and a CAPTCHA widget on
  sign-in and OTP send. Production refuses to boot without an explicit choice for each integration.
  Prerequisites: [SETUP.md](SETUP.md#registration-otp--login-captcha--prerequisites-and-configuration).

- **(2026-11-17, session 49) Conditional fields in challenge forms.** Admins set any form field to
  appear only for chosen answers of an earlier dropdown / radio / checkbox field (chains allowed),
  in the form builder — no code change per challenge. Enforced on the server too: hidden fields
  are never required and their answers are dropped. Needs `prisma migrate deploy` on release.
  See [API.md](API.md) (`PUT /challenges/:id/form`) and [DATABASE.md](DATABASE.md) migration 26.

- **(2026-11-17, session 49) Sign-in & registration made WCAG 2.2 AA compliant** (en + bn): labels,
  inline translated errors, focus management, contrast, target size, CAPTCHA/OTP accessibility,
  skip link, page titles. The report was removed from `docs/` on 2026-11-19; read it with
  `git show 814b8e5:docs/WCAG-2.2-Accessibility-Report.md`.

- **(2026-11-17, session 49) Landing page WCAG 2.2 AA work (en + bn), no visual change** — popup focus
  trap, search label + focus ring, headings/lists/landmarks, aria-current, translated labels, `lang`
  on English content, sticky-header focus offset. Not a full conformance claim — open items below.
  Report removed from `docs/` on 2026-11-19; read it with
  `git show 814b8e5:docs/WCAG-2.2-Landing-Page-Accessibility-Report.md`.

- **(2026-11-17, session 49) Admins can edit published innovations** — Platform/System admins can
  edit any innovation at any status (API + list/manage/edit pages); innovators unchanged. See
  [API.md](API.md) `PATCH /innovations/:id` and [ROLES.md](ROLES.md).

- **(2026-11-17, session 49) Challenge wording** — submit page shows one title, "Submission Form –
  {challenge name}" (en + bn), with no separate heading; the details page section "Resources" is now
  "Attachments" / "সংযুক্তি".

## Current work

*(nothing in progress as of this update — the mobile-responsiveness sweep above is the most recent
completed work)*

## Upcoming

- No dated milestones are recorded anywhere in the repo or `Documents/`. If a delivery schedule
  exists, add it here — for now this section stays a backlog, not a timeline.
- Backlog candidates worth scoping (pull from Known Issues / Technical Debt below as they're
  picked up).

## Known issues

- **GitLab image publishing is down (since 2026-11-18)** — `publish-api` / `publish-web-dev`
  need the `nir-image-builder` runner, which is offline, so `development` pipelines fail at the
  publish stage (#1797, #1800) and no new images have been pushed since #1796. Verify still passes.
  The fix is either to restart that runner (its owner, probably Shuvashis Das) or to merge the
  Kaniko MR from `ci/kaniko-publish`. See [SETUP.md § GitLab CI pipeline](SETUP.md#gitlab-ci-pipeline-gitlab-ciyml).
- **Migration 29 drops the old challenge section columns (2026-11-18)** — run it on a server only
  after a DB backup; any external client still sending `problemStatementEn` etc. has those values
  silently ignored. Only old sections that had text were
  carried over as fields.
- **Bulk SMS is unavailable on the live Teletalk config (2026-11-18)** until
  `SMS_TELETALK_BULK_SMS_CLASS` (and maybe `_BULK_SMS_ID`) are obtained from Teletalk/a2i — the
  OTP class rejects >70 bytes. Bulk SMS was tested only with `SMS_PROVIDER=console`; check the
  first real bulk SMS (cost: 1 credit per part per recipient).
- **Bulk messaging assumes one API instance (2026-11-18):** the worker is in-process. Running two
  API replicas could deliver one job twice. Move to a DB-claimed or queue-based worker before
  scaling out. No "retry failed recipients" action yet, and no unsubscribe/opt-out handling.
- **OTP email not yet checked in Outlook desktop, Apple Mail or mobile mail apps (2026-11-18).**
  Built to the usual compatibility rules (tables, inline CSS, MSO fallbacks) and verified in Gmail
  web only. Open one of the `[TEST]` emails sent to the developer inbox on those clients, or use a
  rendering service (Litmus / Email on Acid), before relying on it.
- **Landing page — open WCAG items (2026-11-17):** hero flow lines / pulsing "live" dots / header
  sparkle animate forever with no pause control (2.2.2 — they only stop under OS "reduce motion";
  kept by decision). The challenge popup's countdown light sweep (added 2026-11-19 at the user's
  request) is in the same category: endless, with no pause control, and hidden under "reduce motion".
  The popup itself can be closed. The moving glow band (`<GlowSweep />` / `animate-strip-sweep`) on the
  stats strip and the challenge banner, and the drifting green orbs (`<DriftingOrbs />`, `animate-orb-a/b/c`) on the hero and
  Quick Links,
  all added 2026-11-19 at the user's request, are in the same category too. The search placeholder was fixed (`#66768F`, 4.61:1). Footer
  Privacy/Terms/Accessibility look like links but aren't; footer "Register as an innovator" points to
  `?role=mentor`. Real screen-reader and real-device passes still pending.

- **`ink-500` / `ink-300` / `ink-200` are not defined in `tailwind.config.ts`** (found 2026-11-17),
  yet `text-ink-500` etc. are used across the site — they generate no CSS, so that text inherits
  its parent's colour. Fixed on the auth pages only. Define the steps (checking contrast) or replace
  the classes. Also pending from the WCAG work: manual screen-reader passes (NVDA/JAWS/TalkBack/
  VoiceOver) and an audit of the shared header/footer. Details are in §7 of the removed sign-in report:
  `git show 814b8e5:docs/WCAG-2.2-Accessibility-Report.md`.

- **Any Expert Evaluator can evaluate any SHORTLISTED innovation (found 2026-11-16).**
  `POST /evaluations` checks the stage, but not whether the evaluator is assigned to the
  innovation or covers its category. The evaluator's list only *shows* assigned or
  category-matched items, but the API doesn't enforce it, and the first SHORTLIST/REJECT decides
  the outcome. A fix would mirror `listAssignedToMe` (panel assignment OR category match); not
  done yet because it changes who may evaluate.
- **Challenge answers don't feed the generic innovation fields (2026-11-16).** Only text fields
  can map to title/summary/problem/solution. A challenge's "stage" or "type" question (radio or
  select) doesn't set `developmentStage`/`innovationType`, so the public "Innovation details" card
  shows defaults (e.g. Stage: Idea) even when the applicant answered "Prototype".

- **Self-registration is now active immediately (2026-11-15), including privileged-looking
  roles.** *Mitigated 2026-11-16:* sign-up no longer offers Investor / Mentor / Ministry Focal
  Point at all (the dropdown is fixed to Innovation Submitter and the API rejects other roles), so
  the risk below only returns if `SELF_SERVICE_ROLES_AT_SIGNUP` is switched back on. How users
  get those roles in the meantime (admin User Management, or the per-role `/register` endpoints
  from the dashboard) is still a product decision. A verified OTP proves only control of an email/phone. Investor, Mentor and especially
  **Ministry Focal Point** (tied to a ministry the registrant picks) used to get a human check via
  User Approvals; now they don't. If that matters, the options are: keep auto-activation for
  Innovation Submitters only and queue the other roles, or auto-activate everyone but require
  admin confirmation of the ministry link. Decision needed from the product owner.
- **Challenge reviewer views stay English for form question labels.** Submissions store a
  snapshot of the English labels (`challengeResponses[].label`), so the Bangla site's "Challenge
  submission" block shows English question text. Fine for reviewers; storing `labelBn` in the
  snapshot would fix it for submitters if wanted.
- **Server-side validation messages on challenge submit are English** (`fieldErrors` from
  `validateResponses`). Rarely seen, since the client validates first in the visitor's language.

- **Uploads over 1 MB fail on dev.challenge.gov.bd (2026-11-15)** — the host nginx is on the
  default `client_max_body_size 1m` and returns 413. Server-side fix: `client_max_body_size 55m;`
  (see [SETUP.md](SETUP.md#docker-path-not-used-on-this-machine-but-supported)). Two related
  app-side gaps in `apps/web/src/lib/upload.ts` (used by the challenge submission form and the
  innovation edit page): it sends the stored access token without the refresh-on-401 that
  `lib/api-client.ts` does, so an upload after 15+ minutes on the form fails "Unauthorized"; and a
  non-JSON error reply (like nginx's 413 HTML) surfaces only as a generic "Upload failed".
  **Re-measured 2026-11-16, still unfixed:** cutoff is exactly 1 MiB of request body (a
  1,048,300-byte file is stored, 1,048,400 → 413), logged in or not. The open challenge `uich`
  tells applicants "Max 5 MB" / "Max 50 MB" and both fields show only "Upload failed" for a 2 MB
  file; the admin banner upload shows "Upload failed — try a smaller image…". "Upload failed" is
  English on the Bangla site too (thrown in `lib/upload.ts`). (Since 2026-11-17 the challenge form
  no longer prints "Max N MB" under file fields — the size message appears only when a picked file
  is over the field's limit — but the 1 MiB proxy cutoff still applies until nginx is fixed.)
- **The challenge popup opens on the challenge's own submit page (seen 2026-11-16)** —
  `challenge-popup.tsx` only hides on `/dashboard`, `/sign-in`, `/register`, so it covers
  `/challenges/<slug>/submit` (and the details page) until dismissed. Hide it under `/challenges/`.

- **Challenge-submission placeholders on public pages (2026-11-10)** — a challenge submission
  whose form has no field mapped to Problem statement / Proposed solution stores the placeholder
  "See the challenge submission responses (…)" in those columns. Reviewers see the real answers
  in the Challenge submission panel, but if such an innovation is later **published**, the public
  page (which never receives `challengeResponses`) shows that placeholder text. Mitigation today:
  map those fields in the form builder (the recommended starter fields do), or edit the text
  before publishing. A cleaner fix would hide those sections on the public page for challenge
  submissions.
- **Uploaded files are not bound to their uploader (pre-existing, more visible since 2026-11-10)**
  — `POST /uploads` doesn't record who uploaded a file, so a challenge submission can reference
  any existing `/uploads/<uuid>` file it knows the URL of. URLs are random UUIDs, so this needs a
  leaked URL to exploit; challenge validation does confirm the file exists, its type and its size.
  Files attached to a challenge submission become `InnovationAttachment`s, which are public once
  the innovation is published (same as general submissions).
- **Challenge submissions can't be edited/resubmitted by the submitter** — the generic edit form
  is hidden for them (it doesn't match the dynamic form), so a REJECTED challenge submission is
  final unless re-submitted fresh. `/dashboard/innovations/:id/edit` is still reachable by URL for
  a REJECTED one (PATCH works on the core columns); not harmful, but not designed for.
- **`text-sun-700` doesn't exist** — used for the `UNPUBLISHED` pill on the submitter's
  innovation pages; the `sun` ramp in `tailwind.config.ts` stops at 600, so the text color is
  dropped. One-word fix (`text-sun-600`), left out of the 2026-11-10 change to keep scope tight.
  Same class of bug, wider: the `ink` ramp only defines 50/100/400/600/700/800/900/950, so
  `ink-200`/`ink-300`/`ink-500` render **no color** — `text-ink-500` appears in ~37 files (text falls
  back to the inherited color, so it is still readable), but a `bg-`/`border-` with those shades is
  invisible. That is why the admin general-submission toggle vanished when switched off
  (`bg-ink-200`, fixed 2026-11-10 by making the off state red). Fix properly by adding the missing
  shades to `tailwind.config.ts` rather than chasing call sites.
- **The 2026-11-10 UI was not click-tested in a browser** — the Chrome automation extension wasn't
  connected that session. Verified instead by: API e2e suite (12 tests), unit suite (20 tests),
  `tsc --noEmit` on the web app, and every new/changed route returning 200 from the dev server.
  Worth a manual pass of: form builder drag-and-drop, preview, challenge submit with file upload,
  the sign-in → return-to-challenge redirect, and the Submissions page filters.
- **`NIR-2025-000006` diverges between local and production** (2026-09-01) — "Smart Traffic
  Signal Optimization System" is `PUBLISHED` + `isFeatured` in the local dev DB but `ARCHIVED`
  + not featured in the Railway production DB (someone archived it there deliberately). The
  session-37 prod sync skipped it (skip-if-exists), which is why production shows 36 published
  innovations, not 37. Decide whether to un-archive + feature it in prod to match local, or
  archive it locally to match prod — either way, resolve the drift rather than leaving it.

- **Resolved (2026-08-31, issue R-002): Submitter couldn't edit or delete a draft submission** —
  the Submitter Dashboard let a submitter create a draft, upload photos/files, add team members,
  and submit for review, but had no way to change any of the text fields entered at creation or to
  delete a draft outright. The backend edit path (`PATCH /innovations/:id`, ownership + DRAFT/
  REJECTED-status checked, real `PartialType` validation) already existed but had no UI caller —
  `use-innovations.ts`'s `useUpdateInnovation` hook was dead code. Delete had no backend endpoint
  at all. Added `DELETE /innovations/:id` (`InnovationsService.remove` — DRAFT-only, stricter than
  edit's DRAFT-or-REJECTED, owner or privileged role, cascades cleanly per the schema's `onDelete:
  Cascade` child relations — see [API.md](API.md#innovations-innovations)), a new
  `dashboard/innovations/[id]/edit` page built on a `submit/innovation-form-fields.tsx` component
  extracted from `/submit` (so create and edit share the exact same field set, never drift), and
  Edit/Delete-draft actions on both the Submitter Dashboard list and the manage page (Delete behind
  `ConfirmDialog`). Also wired up remove-attachment (`DELETE /innovations/:id/attachments/:id`,
  already existed, unused by any submitter-facing UI before this) so a submitter can remove an
  uploaded file while still editable — "replace" is covered by remove-then-re-upload with the
  existing upload control rather than a new dedicated Replace UI (unlike the Admin Repository
  Management page's `MediaManager`, which does have one — not proportionate to add here for a
  first cut). Verified end-to-end via API calls and Playwright: edit preserves every untouched
  field and never changes `reviewStatus`; non-owner tokens get 403 on both edit and delete;
  unauthenticated requests get 401; once a draft is submitted for review (`UNDER_REVIEW`), both
  edit and delete correctly 400 (not even an admin can force a submitted innovation back to DRAFT
  to reopen this path — `updateStatus`'s `ALLOWED_TRANSITIONS` has no route back to `DRAFT`); the
  list page only renders Edit/Delete on `DRAFT` rows, confirmed against a live mix of
  DRAFT/MIDLISTED/UNDER_REVIEW/PUBLISHED items.
- **Resolved (2026-08-31, issue R-001): Platform Admin couldn't edit an existing News & Event
  post** — the admin panel's News tab only offered Publish (create), Unpublish/Republish, and
  Delete; there was no way to change a post's title/body/image/etc. after creation. The backend
  `PATCH /news/:id` endpoint already existed and was already `PLATFORM_ADMIN`-gated, but nothing
  in the UI called it for a general field edit (only for the unpublish toggle). Added an Edit
  button per row (`dashboard/admin/page.tsx` `NewsTab`) that opens the same field set used for
  creation, pre-filled from the existing row, with Save/Cancel — same pattern already used by the
  Challenges tab. Also closed a real validation gap found while fixing this: `updateNews`'s
  `@Body()` was typed `Partial<CreateNewsDto> & {...}`, a bare TS type that erases to `Object` at
  runtime, which NestJS's global `ValidationPipe` silently skips — so the update endpoint accepted
  any payload shape with no validation. Replaced it with a real `UpdateNewsDto` class (see
  [API.md](API.md#cms-cms-module--content-media-notification-templates-and-all-public-content)),
  and added `NotFoundException`/`ConflictException` (P2002 slug collision) handling. Verified: edit
  preserves publish status in both directions (editing a published post doesn't unpublish it and
  vice versa — `unpublish` is the only field allowed to touch `publishedAt`), non-`PLATFORM_ADMIN`
  tokens get 403, unauthenticated requests get 401, a duplicate slug gets 409, an unknown field
  gets 400, editing a deleted/nonexistent id gets 404.
- **Resolved (2026-08-30): `innovationCode` / `irn` generator collided on every insert** —
  `IdGeneratorService.nextInnovationCode()` / `nextIrn()` derived the running number from a
  `count()` of that year's rows (`NIR-<year>-<count+1>`). Any deletion or non-contiguous seed
  code desyncs the count from the real high-water mark, after which every `innovation.create`
  (and every self-registration, via `nextIrn`) fails the `@unique` constraint with a bare
  500 "Internal server error" — and because the failed insert never lands, the count never
  advances, so it stays wedged. Hit in local dev: 51 rows but codes already up to
  `NIR-2026-000074` (the 23 test-innovation deletion left gaps). Fixed by taking the suffix
  from the highest code already issued for the year (`findFirst` + `orderBy … desc` on the
  zero-padded column) instead of a count. Residual: still a check-then-insert race under
  concurrent creates — acceptable for now, would need a DB sequence / retry-on-P2002 to close.
- **Resolved (2026-08-17): dedicated "Publish" UI now exists** — the Admin Repository Management
  page (`/dashboard/admin/repository`) covers `APPROVED -> PUBLISHED` (first publish),
  `PUBLISHED -> UNPUBLISHED` (takedown), and `UNPUBLISHED -> PUBLISHED` (re-publish), plus
  photo/video management and an activity log. The Moderation page's generic "Move to X" button
  still works for `APPROVED -> PUBLISHED` too (unchanged, not removed) but `UNPUBLISHED` is
  deliberately not exposed there — see [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules).
  **2026-11-15:** Publish/Republish also added to the Admin Evaluations list (Reviewed tab) and
  detail page, and the detail page's missing approve button for no-support-request innovations
  was fixed (session 46).
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

- **Kaniko is archived (2026-11-19)** — if the `ci/kaniko-publish` MR is merged, image builds rely
  on `kaniko-project/executor:v1.23.2`, which gets no more updates. Plan to move back to BuildKit
  on a dedicated runner, or to a maintained Kaniko fork. Kaniko builds also have no layer cache yet
  (`--cache=true --cache-repo=…` would speed up the about 9-minute publish stage).
- **Admin-entered regex in details-field validation (2026-11-18)** — the pattern rule runs an
  admin-written regular expression on the server (whole-value match, ≤ 200 chars, values ≤ 10 000
  chars). Admins are trusted, but a catastrophic pattern could stall a request; if non-admin roles
  ever edit challenges, add a safe-regex check or a time budget.
- **The details-field editor's admin UI is English-only (2026-11-18)** like the rest of Platform
  admin; field content and set-up are bilingual.
- **Registration OTP / CAPTCHA follow-ups (2026-11-12):** (a) procure real CAPTCHA keys (SMTP and SMS are done:
  a2i Google Workspace and Teletalk Bulk SMS, see SETUP.md) and set all of them on every deployed
  environment. Confirm the server can reach `bulksms1.teletalk.com.bd:8091` (outbound HTTP; the
  gateway may whitelist IPs). **Until the server `.env`
  has `CAPTCHA_PROVIDER`/`MAIL_TRANSPORT`/`SMS_PROVIDER`, the API container of this code won't
  boot on a server deploy.** (b) `OtpCode` rows are never purged; add a scheduled cleanup
  (`@nestjs/schedule` is already a dependency). (c) `NotificationsService.deliver()` is still a
  mock; route it through `MailService`/`SmsService`. (d) The sign-in/register UI was browser-checked
  locally with Turnstile *test* keys only; check it again with the real site key on staging (the
  domain must be allow-listed in the CAPTCHA dashboard). (e) Login is still case-sensitive on email
  (pre-existing), while OTP targets are lower-cased; forgot password (2026-11-18) matches the email
  case-insensitively, so someone registered as `Name@x.com` can reset by typing `name@x.com` but
  must still sign in with the original casing. Worth unifying (lower-case on login + a one-off
  data check for case-only duplicates). (f) The
  per-IP throttles depend on `TRUST_PROXY` being set correctly behind a proxy.

- **Forgot password follow-ups (2026-11-18):** (a) the reset endpoints say whether an
  email/number is registered (deliberate, matches registration — revisit both together if
  account enumeration becomes a concern); (b) no "your password was changed" notification email/SMS
  is sent yet — add one once `NotificationsService` delivers for real; (c) there is still no
  signed-in "change password" screen (`PATCH /users/me` doesn't take a password); (d) the Bangla
  reset SMS is the generic `NIR কোড` text (70-byte Teletalk limit), so it doesn't say "reset".

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
- **Mocked integrations** (NID/BIN verification, SMS/Email *notifications*, SSO) are stable-interface stand-ins
  (registration OTP email/SMS is real as of 2026-11-12),
  not implementations — swapping in real providers is deferred, tracked work, not a bug.
- **Resolved (2026-08-17):** the sign-in page's `DEMO_ACCOUNTS` list (previously duplicating the
  demo-accounts table in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#demo-accounts) and
  `apps/api/prisma/seed.ts`) was removed from the sign-in page entirely — see
  [SESSION_LOG.md](SESSION_LOG.md). `PROJECT_CONTEXT.md` is now the only listing.
- **Two near-identical chip-multi-select implementations** (admin specialization-category picker
  in `dashboard/admin/page.tsx`, `ChipSelect` in `register/page.tsx`) — see
  [UI_GUIDELINES.md](UI_GUIDELINES.md#component-inventory-appswebsrccomponents). Worth extracting
  to a shared component if a third use case shows up.
- **`cms/public-content.controller.ts`'s other PATCH endpoints likely have the same unvalidated-
  body bug just fixed for `updateNews`** (2026-08-31) — `updateFaq`, `updateChallenge`,
  `updateResource`, `updatePartner` all still type their `@Body()` as `Partial<CreateXDto> & {...}`,
  a bare TS type rather than a class-validator class, which the global `ValidationPipe` silently
  skips at runtime (no `whitelist`/`forbidNonWhitelisted`/type-coercion actually applied to PATCH
  bodies on any of these). Only `news` got a proper `UpdateNewsDto` so far, scoped to issue R-001 —
  the same fix (hand-written `Update*Dto` class per resource, all fields `@IsOptional()`) should be
  applied to the rest before they're relied on for anything security-sensitive.
- **16 bulk-imported innovations have inferred category/type/stage, not source-confirmed values**
  (`NIR-2026-000059`–`NIR-2026-000074`, 2026-08-13 import — see
  [SESSION_LOG.md](SESSION_LOG.md#2026-08-13-session-12--local-env-started-bulk-imported-30-innovations-from-external-template)).
  The source spreadsheet rows were missing `Category*`/`Innovation Type*`; the import script
  guessed from title/summary text. Needs a spot-check pass in `/dashboard/admin` before these are
  treated as authoritative. **As of 2026-09-01 these are also live in the production DB** (session
  37 prod sync), so the spot-check now affects the public site — do it in prod, or fix locally
  and re-sync the corrected rows.

## Milestones

*(none defined in the repo yet — add them here once a delivery plan exists, rather than inferring
dates from commit/migration timestamps)*

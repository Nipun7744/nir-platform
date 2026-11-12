# UI Guidelines — NIR Platform

> Frontend design system reference (`apps/web`). Update whenever tokens, components, or layout
> conventions change — this should always match `tailwind.config.ts` / `globals.css`, not the
> other way around.

## Design principles

- **Bilingual by default**, not an afterthought: every page renders in `en` or `bn` from the same
  route tree (`src/app/[locale]/**`), driven by `next-intl`. Bangla uses a different font
  (`Hind Siliguri`) but the **same layout** — Bangla is LTR, so there is no RTL/mirroring logic.
  See "i18n" below.
- **Government identity first:** every public page has a two-tier header — a slim navy
  "government identity bar" above the main nav — establishing the site as an official GoB
  platform before showing product chrome.
- **One content-width wrapper:** `.container-page` (`globals.css`) is the only page-width utility
  in the app (`mx-auto w-full px-6; max-width: 1200px`). Use it, don't invent a second one.
- **Visible focus everywhere:** `.focus-ring` (`globals.css`) is the standard
  focus-visible treatment (green ring + offset) applied to interactive elements. Apply it to any
  new interactive element rather than styling focus state ad hoc.
- **Respect reduced motion:** `globals.css` already zeroes animation/transition durations under
  `prefers-reduced-motion: reduce`. New Framer Motion animations should degrade gracefully under
  that setting too (most current ones are decorative and safe to skip).

## Color palette

⚠️ **Two color systems currently coexist** in `tailwind.config.ts`. Know which one a given piece
of UI is using before you touch it:

**1. Generic scale** (`ink`/`brand`/`sun`/`clay`/`paper`) — a full 50–900 ramp, present in config
but lightly used in current pages:

| Token | Key values |
|---|---|
| `ink` (near-navy gray) | 50 `#eef2f6` · 100 `#d7e0e9` · 400 `#4d6a84` · DEFAULT/900 `#0b1f33` · 950 `#071626` |
| `brand` (green) | 50 `#e9f7f0` · 300 `#63c890` · 500 `#1f9a5c` · 700 `#146540` · 900 `#0f412c` |
| `sun` (amber) | 50 `#fef8e8` · 300 `#f6cf5f` · 500 `#e59d17` |
| `clay` (terracotta) | 50 `#fbf3ee` · 400 `#d99a6c` · 600 `#a5613689` *(8-digit, has alpha `89`)* |
| `paper` | `#f7f7f2` |

**2. "NIR" flat set** — what the header, footer, hero, and most cards actually use today:

| Token | Value | Token | Value |
|---|---|---|---|
| `navy` | `#13243F` | `nirgreen` | `#00A86B` |
| `navy-2` | `#1B3B6F` | `nirgreen-deep` | `#007A4E` |
| `navy-line` | `#2A4066` | `nirgreen-dark` | `#005C3B` |
| `mist` | `#F2F6F4` | `amber` | `#F7B733` |
| `mist-2` | `#E9F0EC` | `amber-deep` | `#8A5B00` |
| `greenline` | `#DBE4DF` | `flagred` | `#F42A41` |
| `slate` | `#4E5F7A` | | |

**Guidance:** for new UI, prefer the **NIR flat set** — it's what the header/footer/homepage
already use, so new pages will look consistent with them. Don't introduce a third palette; if
the two existing ones are ever consolidated, note that decision here and in
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## Typography

Fonts loaded via `next/font/google` in `src/app/[locale]/layout.tsx`, exposed as CSS vars and
mapped in `tailwind.config.ts`:

| Tailwind class | Font | Weights | Use |
|---|---|---|---|
| `font-display` | Bricolage Grotesque | 400/600/700/800 | headings |
| `font-sans` | Instrument Sans | 400/500/600/700 | body (EN) |
| `font-bangla` | Hind Siliguri (bengali+latin) | 400/600 | body (BN) — applied to `<body>` when `locale === 'bn'` |
| `font-mono` | IBM Plex Mono | 400/500/600 | code/data display |

## Layout rules

- `boxShadow.soft`: `0 1px 2px rgba(11,31,51,.04), 0 8px 24px rgba(11,31,51,.06)` — ambient card
  lift.
- `boxShadow.card`: `0 1px 3px rgba(11,31,51,.06), 0 2px 8px rgba(11,31,51,.05)` — tighter card
  shadow.
- `borderRadius.xl2`: `1.25rem` — used for larger card/panel corners.
- No custom spacing scale or breakpoints — Tailwind defaults apply everywhere.
- `darkMode: ['class']` is configured but **not wired up** — there's no theme toggle anywhere in
  the app. Don't assume dark mode works; if you add dark-mode classes, you're also on the hook
  for adding the toggle, or they'll be dead code.
- Custom keyframes available: `fade-up`, `drift` (float loop), `pulse-soft`, `dash`/`flow`
  (SVG stroke-dashoffset, used by the homepage confluence graphic), `live-pulse`.

## Component inventory (`apps/web/src/components/**`)

No component-library convention (no shadcn/ui, no `class-variance-authority`, no `cn()` helper,
no `forwardRef` wrapper pattern) — confirmed absent repo-wide. Components are plain function
components styled with Tailwind utilities directly, using `clsx` for conditional classes. There
are **no shared primitives** for `Button`/`Input`/`Card` — each page hand-writes its own (e.g. a
local `inputCls` constant). Keep this in mind before assuming a `<Button>` exists to import.

| Folder | Contents |
|---|---|
| `ui/` | `category-icon.tsx` (name→lucide-react icon map), `stage-pill.tsx` (colored badge for `DevelopmentStage`), `innovation-card.tsx` (repository grid card), `animated-counter.tsx` (count-up via Framer Motion), `file-upload-button.tsx` (wraps `lib/upload.ts`), `confirm-dialog.tsx` (2026-08-17 — blocking confirm modal for critical/destructive actions; first of its kind in this repo, reuse it rather than adding another `window.confirm`/bespoke modal — originally admin-only contexts, extended 2026-08-31 to the Submitter Dashboard's delete-draft/remove-file flows, so treat it as app-wide, not admin-specific), `pagination.tsx` (2026-08-17 — record-count summary + optional page-size selector + Previous/windowed-page-numbers/Next; first reusable pagination component — `repository-browse.tsx`'s inline flat page-number list predates it and wasn't retrofitted, reuse this one for new paginated admin lists instead of copying that older pattern), `mutation-error.tsx` (2026-11-12 — `<MutationError mutation={m} fallback="…" />` shows the API's error message under an action that failed; use it on every mutation button so a failed action never looks like a dead button — used by the preliminary and authenticity review pages) |
| `auth/` | `auth-card.tsx` (shared centered-card shell for sign-in/register), `sso-buttons.tsx` (disabled placeholder buttons), `captcha-widget.tsx` (2026-11-12 — `CaptchaWidget` with a `reset()` ref: one component for Turnstile/reCAPTCHA v2/hCaptcha, provider + site key from `useSecurityConfig()`; renders nothing for provider `none`; **always call `reset()` after a submit**, because tokens are single-use. The one deliberate `forwardRef` in the codebase, needed for the imperative reset) |
| `layout/` | `site-header.tsx`, `site-footer.tsx`, `locale-switcher.tsx` (EN/বাংলা pill toggle), `challenge-popup.tsx` (site-wide "running challenge" modal, see below) |
| `home/` | `hero.tsx`, `confluence-graphic.tsx` (decorative animated SVG), `stats-strip.tsx`, `quick-links.tsx`, `featured-innovations.tsx`, `category-grid.tsx`, `challenge-banner.tsx`, `news-section.tsx`, `partners-strip.tsx` — landing-page-only, each fetches its own data |
| `submit/` | `innovation-form-fields.tsx` (2026-08-31, R-002) — the full innovation submission field set, extracted out of `app/[locale]/submit/page.tsx` so `dashboard/innovations/[id]/edit/page.tsx` can reuse it verbatim instead of forking the form; exports `InnovationFormFields`, `InnovationFormState`, `EMPTY_INNOVATION_FORM` |
| `repository/` | `repository-browse.tsx` (search/filter UI, syncs query params), `innovation-detail.tsx` |
| `dashboard/` | `dashboard-shell.tsx` — the shared authenticated chrome (see below) |
| `challenge-form/` | (2026-11-10) `dynamic-form.tsx` — `DynamicForm` renders any challenge's configured fields (all 11 `FormFieldType`s, accessible labels/`aria-describedby`, inline errors; `preview` disables file upload) + `validateDynamicForm` (client mirror of the API's `validateResponses` — instant feedback only, the server is authoritative); `challenge-responses.tsx` — read-only `ChallengeResponses` panel (renders nothing when `challengeResponses` is null, i.e. for the public); `types.ts` — shared DTO types, type/mapping labels, and `ALLOWED_FILE_EXTENSIONS` (**must match** `apps/api/src/challenges/challenge-rules.ts`) |
| `admin/` | (2026-11-10) `challenge-form-builder.tsx` — the admin form builder (local edits, HTML5 drag-and-drop **plus** up/down buttons for keyboard users, inline field editor, "Start from recommended fields" template, Preview with "Test validation", single "Save form" → `PUT /challenges/:id/form`, server errors listed verbatim, delete via `ConfirmDialog`) |
| `reviews/` | `review-comment-timeline.tsx` — shared read-only comment list, reused across preliminary-review/authenticity-review/evaluation pages |

Two small chip-multi-select implementations exist independently (not extracted into a shared
component yet — a consolidation candidate): one inline in
`app/[locale]/dashboard/admin/page.tsx` (`EvaluatorDetails`/`PreliminaryReviewerDetails`/
`AuthenticityReviewerDetails`, for admin-assigned specialization categories) and a `ChipSelect`
inline in `app/[locale]/register/page.tsx` (for the sign-up form's optional sector-interest /
expertise-tag pickers). Same visual pattern (`border-brand-300 bg-brand-50 text-brand-800` when
active), written twice.

## Reusable patterns

- **CAPTCHA-gated actions + OTP step (2026-11-12).** The submit stays disabled until
  `useSecurityConfig()` has loaded and, if a provider is configured, the widget has produced a
  token; a small hint ("Complete the security check to continue.") shows meanwhile. After every
  attempt (success or failure) call `captchaRef.current?.reset()`. The register page is two
  steps in one component (`step: 'details' | 'verify'`), and it scrolls to the top on every step
  change. The details form ends with an
  Email/SMS radio-card choice (the phone label drops "(optional)" and becomes `required` when SMS
  is picked), then the CAPTCHA, then "Send verification code". The verify step is a separate
  `AuthCard` with a large monospace code input (`inputMode=numeric`,
  `autoComplete=one-time-code`), a resend button with a countdown (the CAPTCHA widget only
  appears once a resend is allowed, since each send needs a fresh token), and "Change details".
  New strings live in the `auth` namespace in both `en.json` and `bn.json`.

- **Gating the general "Submit an Innovation" entry points (2026-11-10).** Never hard-code a
  `/submit` link: in client components use `useGeneralSubmissionOpen()` (`hooks/use-settings.ts`,
  true only once the backend confirms the switch is on — so a disabled switch never flashes the
  button); in server components wrap the link in `<GeneralSubmitGate>`
  (`components/layout/general-submit-gate.tsx`, used by the footer). Challenge CTAs ("Apply now"
  in the homepage banner/popup, "Submit Innovation" on `/challenges`) go to
  `/challenges/:slug/submit` and render only when `challenge.acceptingSubmissions` is true.
- **Post-login return path (2026-11-10).** Send users to `/sign-in?next=<path>`; read it with
  `safeNextPath()` (`lib/safe-next.ts` — same-site paths only, rejects `//host` and `/\host`
  open-redirect tricks) and pass it on with `withNext()`. Pages that call `useSearchParams` must
  render inside `<Suspense>` (sign-in/register now wrap an `…Inner` component for this).

- **Homepage "Browse by category" grid (`components/home/category-grid.tsx`) shows only the
  first 6 categories on mobile, all of them from `sm:` (640px) up** (2026-08-23) — pure CSS via
  `index < 6 ? 'inline-flex' : 'hidden sm:inline-flex'` on each pill, not a data-fetch change; all
  categories are still fetched and rendered, the rest are just hidden below `sm:`. The existing
  "See every category" link is the way to reach the rest on mobile. Category order is whatever
  `useCategories()` returns (not re-sorted for this), so "top 6" means first 6 in that order, not
  the 6 with the highest innovation counts — revisit if that distinction ever matters.
- **Dashboard shell** (`components/dashboard/dashboard-shell.tsx`): every `/dashboard/*` route is
  wrapped in this via `dashboard/layout.tsx`. It provides: the auth guard (`useRequireAuth()`,
  redirects to `/sign-in` once hydration confirms no token), a fixed `240px` left sidebar
  (profile card + role-filtered nav via `NAV_ITEMS`, each entry optionally restricted to specific
  `Role`s), and a sign-out button. Individual role pages implement their own tabs/filters inline
  — there's no nested layout per role.
- **`StagePill`** mirrors badge classes also present in `nir.css` — if you touch one, check the
  other stays consistent.
- **Inline edit-row pattern for admin CRUD tabs (2026-08-31, `dashboard/admin/page.tsx`)** —
  `ChallengesTab` and `NewsTab` (issue R-001) both edit an existing item in place rather than via a
  separate modal: the tab keeps `editingId`/`editForm` state alongside the create-form's own
  `form` state, a `startEdit(item)` function copies the item's fields into `editForm` (`?? ''` for
  nullable strings, `.slice(0, 10)` for any date field feeding a `type="date"` input), and the
  field markup itself is factored into a shared `*FormFields` component (`ChallengeFormFields`,
  `NewsFormFields`) so create and edit render identically. The list `.map()` swaps a row for the
  inline edit card (`border-brand-300` instead of `border-ink-100`, Save/Cancel buttons) when
  `editingId === item.id`. Save calls the same `useUpdateNews`/`useUpdateChallenge`-style
  `useAdminUpdate` mutation as any other partial update, sending only the edited-fields object
  (never an unrelated status/toggle field, so editing never has a side effect on something like
  publish status) and closes the row (`setEditingId(null)`) `onSuccess`. Reuse this shape — not a
  modal — for the next admin tab (`ResourcesTab`, `PartnersTab`, `FaqTab`) that needs edit support;
  none of them have it yet (create + toggle/delete only).
- **No shared Modal/Toast/Sidebar primitive** — dialogs and toggles are built inline with local
  `useState` per component. If you need one of these more than once, that's a signal to extract
  it rather than copy the pattern again. The one modal in the app so far,
  `components/layout/challenge-popup.tsx`, follows this same inline-`useState` convention (no
  primitive extracted) — mounted once in `app/[locale]/layout.tsx` so it's site-wide, gated off
  `/dashboard`, `/sign-in`, `/register` via `usePathname()`, shown at most once per browser
  session per challenge (`sessionStorage`, keyed by `challenge.slug`) so it doesn't re-nag on
  every route change or reload. If a second modal need ever comes up, that's the point to extract
  a shared primitive from this one rather than copying it again.
- **Mobile-safe modal sizing pattern (2026-08-23):** both modals in the app
  (`challenge-popup.tsx`, `confirm-dialog.tsx`) follow the same shape to stay inside the viewport
  on small screens — the outer overlay is `fixed inset-0 flex items-center justify-center p-4`;
  the modal box itself gets `max-h-[calc(100dvh-2rem)]` (the `2rem` matches the overlay's `p-4`
  so the box can never exceed the visible viewport) plus `overflow-y-auto` on whichever inner
  wrapper holds the long content, so content scrolls instead of the box growing past the screen.
  `challenge-popup.tsx` specifically needed a `flex flex-col` box with the close button as a
  sibling *outside* the `overflow-y-auto` wrapper (not inside it) — a close button positioned
  `absolute` inside a scrolling ancestor scrolls away with the content, which was the original bug
  (close button became unreachable on mobile when the banner image + long description pushed the
  box taller than the viewport). Copy this shape for any new modal rather than reinventing sizing.
- **Picking "the" running challenge among several `OPEN` ones** — both the homepage banner
  (`challenge-banner.tsx`) and the popup (`challenge-popup.tsx`) use the same selection rule:
  filter to `status === 'OPEN'`, then prefer the one the admin marked `isFeatured` (set from
  `/dashboard/admin`'s Challenges tab — a single-featured invariant enforced server-side, see
  [DATABASE.md](DATABASE.md#component-4--communication--cms)), falling back to the first OPEN
  challenge if none is featured. Reuse this exact fallback chain (`featured ?? first-open`) in any
  new UI that has to pick one challenge to highlight — don't invent a different tie-break.
- **Popup = teaser, details page = full write-up (2026-11-11).** The running-challenge popup
  stays short on purpose (it interrupts the visitor): description clamped to 3 lines
  (`line-clamp-3`) plus an amber "N days left" badge; everything else lives on
  `/challenges/[slug]`. Don't add sections to the popup — add them to the details page.
  "Days left" everywhere comes from `challengeDaysLeft()` (`lib/challenge-dates.ts`), which
  mirrors the API's end-of-deadline-day-UTC rule (`0` = "Last day to apply", `null` once passed).
- **Challenge details page (`app/[locale]/challenges/[slug]/page.tsx`, redesigned 2026-11-11)** —
  NIR flat palette; header (status/featured/days-left pills, title, organizer) → banner (16:9 on
  mobile, 21:9 from `lg`) → `lg:grid-cols-[minmax(0,1fr)_320px]` two-column body (both children
  `min-w-0`). Main column: an "On this page" chip nav (only when > 2 sections) and sections in a
  fixed order — Overview, The problem, Who can apply, Timeline (vertical list; past phases greyed),
  Evaluation, Prizes (`prizeInfoEn` headline + `prizeDetails*`), Resources (icon + truncated
  label links, new tab), FAQ (native `<details>` accordion), Additional information. **A section
  renders only when its data exists**, so old challenges just show Overview. Admin text is shown
  with `whitespace-pre-line` (line breaks kept, never HTML). Sidebar: sticky (`lg:top-36`) card with
  dates/prize/organizer + Submit button or the API's `closedReason`, and an optional Contact card.
  Mobile: a fixed bottom "Submit your innovation" bar (only when `acceptingSubmissions`), so the
  page has `pb-32` below `lg`. Strings live in the new `challengeDetail` message namespace (EN+BN);
  Bn content columns fall back to En.
- **Admin challenge form — "Details page content" (2026-11-11).** `ChallengeFormFields` in
  `dashboard/admin/page.tsx` now ends with a collapsible `ChallengeDetailsFields` block (open by
  default once anything is filled): the five text sections, repeatable rows with Add/Remove for
  timeline phases, resources (each with its own Upload button → `/uploads/...`) and FAQ, contact
  fields, and a nested "বাংলা translations" block (`titleBn`, `descriptionBn`, Bn sections).
  `challengeToForm()` / `challengeFormToPayload()` map API ⇄ form; half-filled list rows are
  dropped on save rather than failing validation.
- **Challenge timeline display** — `Challenge.startDate` is optional; every public display
  (banner, popup, `/challenges` list, `/challenges/[slug]` detail) shows `startDate – deadline` as
  a range when `startDate` is set, and falls back to the pre-existing single-`deadline` display
  when it isn't (so older challenges created before this field existed still render correctly).
  Copy this fallback rather than assuming `startDate` is always present.
- **Submitter-facing status labels differ from the internal `ReviewStatus` names, on purpose, and
  each of the three now has its own distinct label AND color.**
  `dashboard/innovations/page.tsx` and `dashboard/innovations/[id]/page.tsx` (the submitter's own
  "My innovations" list and detail/manage page — nowhere else) both define a
  `SUBMITTER_STATUS_LABELS` map and a `submitterStatusLabel()` helper (duplicated in both files,
  matching how `STATUS_STYLES` in the same two files is already duplicated rather than extracted —
  see "No component-library convention" above): `AUTHENTICITY_REVIEW` → "LONGLISTED" (blue —
  `bg-blue-50 text-blue-600`, a raw Tailwind color reached for outside the documented ink/brand/
  sun/clay palette, same precedent as `REJECTED`'s raw red), `SHORTLISTED` → "MIDLISTED" (clay —
  `bg-clay-50 text-clay-600`), `SELECTED` → "SHORTLISTED" (brand/green —
  `bg-brand-100 text-brand-700`, unchanged) — everything else (including `APPROVED`, which has no
  entry in `SUBMITTER_STATUS_LABELS` and simply reads "APPROVED") falls through to the raw
  `reviewStatus.replace(/_/g, ' ')` as before. `APPROVED` does have its own `STATUS_STYLES` entry
  (`bg-brand-100 text-brand-800`, matching `PUBLISHED`'s shade), and so does `UNPUBLISHED`
  (`bg-sun-100 text-sun-700` — ⚠️ `sun-700` is **not** defined in `tailwind.config.ts` (the `sun` ramp stops at 600), so this text color silently doesn't apply; found 2026-11-10, not fixed — see ROADMAP; added 2026-08-17 alongside the Admin Repository Management module —
  a submitter's own innovation can land in this status if an admin unpublishes it, so this page
  needed the entry even though neither page is part of that module) — every new `ReviewStatus`
  value needs one of these or it silently renders with no pill color at all (this happened once
  already with `AUTHENTICITY_REVIEW`; don't repeat it). The color lookup
  (`STATUS_STYLES[innovation.reviewStatus]`) still keys off the *raw* `reviewStatus`, not the
  relabeled text. If you touch either page's status pill, keep both files in sync — see
  [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules) for why the mapping exists and how the
  `SHORTLISTED -> SELECTED`/`REJECTED` transition actually fires (the Expert Evaluator's own
  decision, not an admin). Every other page that shows `reviewStatus` (moderation,
  preliminary/authenticity review queues, evaluations, admin evaluations) is reviewer/admin-facing
  and must keep showing the real internal stage name — don't apply this relabeling there.
- **Submitter can edit or delete their own DRAFT (edit also reaches REJECTED) submission
  (2026-08-31, R-002)** — `dashboard/innovations/page.tsx` (list) and
  `dashboard/innovations/[id]/page.tsx` (manage page) both show Edit + Delete-draft actions,
  conditionally: Edit whenever `canEdit` (`reviewStatus` is `DRAFT` or `REJECTED` — the existing
  convention those two pages already used for attachments/team-member edits, extended here rather
  than narrowed), Delete strictly `reviewStatus === 'DRAFT'` only (a rejected submission still has
  review history worth keeping — see the identical reasoning in
  [API.md](API.md#innovations-innovations)'s `DELETE` row). Edit links to a new
  `dashboard/innovations/[id]/edit` page built from the same `InnovationFormFields` component
  `/submit` uses (see the `submit/` row above) — pre-filled via a `toFormState()` mapper, saved
  through the `useUpdateInnovation` hook that already existed in `use-innovations.ts` but had no
  caller anywhere in the app before this. Unlike `/submit`, the edit page doesn't auto-redirect
  after saving (an inline "Changes saved." confirmation instead, via the mutation's own
  `isSuccess`) — editing is meant to support multiple saves in one sitting, with an explicit "Back
  to submission" / "Done editing" link rather than a wizard-style bounce away after one save. Both
  pages' Delete-draft button (and the manage page's new per-attachment Remove button) go through
  `ConfirmDialog` — see its updated note in "Component inventory" above.
- **Admin "Submit & publish" reuses the submitter pages rather than a separate admin form
  (2026-11-04)** — Repository Management's header has an **Add innovation** button (same
  `rounded-full bg-brand-600` pill + `Plus` icon as "New submission" on `/dashboard/innovations`)
  linking to the ordinary `/submit` page, whose footnote text switches for admins. The manage page
  (`dashboard/innovations/[id]/page.tsx`) then swaps its bottom "Ready for review?" card for a
  same-styled **"Ready to publish?"** card (`Globe` icon, "Submit & publish") when
  `canPublishDirect` — admin role **and** `DRAFT` **and** `submittedById === current user`, mirroring
  the API's own-draft-only rule. Publishing goes through `ConfirmDialog` (it's public and bypasses
  review), shows the API error inline in the card on failure, and redirects to
  `/dashboard/admin/repository` on success. "My innovations" in the sidebar is now also visible to
  `PLATFORM_ADMIN`/`SYSTEM_ADMIN` so admins can get back to unpublished drafts.
- **Public "Submitted by" card (`components/repository/innovation-detail.tsx`)** normally shows
  the team's Lead Innovator (falling back to the first team member), linked to
  `/dashboard/submitters/:id` for roles allowed to view submitter profiles. For admin-created
  innovations (API field `submittedByAdmin`, non-null only when `Innovation.createdByAdmin`) it
  shows the admin's name/avatar/designation instead, **unlinked** (that route is an innovator
  profile page), and the card renders even if the team is empty. Team members still appear in the
  separate Team section.
- **Reviewer pass-buttons are named after what the submitter will see, not the raw enum value.**
  The Preliminary Review page's pass button reads "Longlist" (was "Shortlist"; still transitions
  `UNDER_REVIEW -> AUTHENTICITY_REVIEW`), the Authenticity Review page's reads "Midlist" (was
  "Shortlist"; still transitions `AUTHENTICITY_REVIEW -> SHORTLISTED`) — only the button label
  changed, not the mutation or the target status. The Expert Evaluation page
  (`dashboard/evaluations/[innovationId]`) replaced its old "Recommendation" dropdown + generic
  "Submit evaluation" button with exactly two direct-action buttons, "Shortlist" and "Reject" —
  each immediately submits with that decision baked in (`recommendation: 'SHORTLIST' | 'REJECT'`),
  no intermediate confirmation step. Don't reintroduce a dropdown or a third option here; if a
  `FUND` recommendation is ever needed again, it needs its own explicit UI, not a slot in this
  binary decision.
- **The Moderation page's generic "Move to X" button no longer offers `SELECTED` from
  `SHORTLISTED`** (`NEXT_STATUS['SHORTLISTED']` is `['REJECTED', 'ARCHIVED']` only) — that specific
  transition is now exclusively the Expert Evaluator's own action (see above), not a generic
  admin/coordinator move. Every other entry in `NEXT_STATUS` is untouched. Don't add `SELECTED`
  back to that array without also reconsidering the evaluator-driven auto-transition it would then
  be competing with. `NEXT_STATUS['SELECTED']` is `['APPROVED', 'ARCHIVED']` — kept (not removed,
  unlike the `SHORTLISTED` case) as a manual fallback for innovations with no Recognition/Mentor/
  Fund request at all, where the Admin Evaluations detail page's approval section shows no action
  button to make the decision through; the normal path is still `PATCH /innovations/:id/approval`.
  `NEXT_STATUS['APPROVED']` is `['PUBLISHED', 'ARCHIVED']` — this generic button is currently the
  *only* way to publish (no dedicated "Publish" UI exists yet).
- **The Admin Evaluations page's Pending/Reviewed tabs key off `reviewStatus`, and which raw value
  means "Pending" changed** when the Expert Evaluator's decision became auto-applying (see above).
  `dashboard/admin/evaluations/page.tsx`: `PENDING_STATUS = 'SELECTED'` (an Expert Evaluator has
  shortlisted it — this **is** the Admin's pending list, exactly what they need to review for their
  own approval decision), `REVIEWED_STATUSES = {'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'}`.
  Do not put `'SHORTLISTED'` (the raw status) back into `PENDING_STATUS` — that status now means
  "awaiting Expert Evaluation," a different, earlier stage than "awaiting Admin's decision." See
  [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules) for the full reasoning, including why
  `REJECTED` is in the Reviewed set here despite `GET /evaluations/shortlisted` normally excluding
  rejected innovations by construction (a rare stray-second-evaluator-vote edge case).
- **`dashboard/admin/evaluations/[innovationId]/page.tsx`'s "Save approval decisions" button is a
  save-and-navigate-away action, not a save-and-stay action — and it approves, it does not
  publish.** `ApprovalSection`'s `handleSave()` sends `finalize: true` (see
  `PATCH /innovations/:id/approval` in [API.md](API.md), which moves `SELECTED -> APPROVED`, never
  `PUBLISHED`) and, only in `onSuccess`, `router.push('/dashboard/admin/evaluations?saved=1')` —
  the redirect never fires optimistically, only after the backend confirms the save. The list page
  (`dashboard/admin/evaluations/page.tsx`) reads that `?saved=1` param in a `useEffect`, shows a
  dismissible green success banner ("Approval decision saved successfully.", auto-dismisses after
  6s), and immediately `router.replace()`s the URL clean so refreshing or navigating back doesn't
  re-trigger it. Because that page now reads `useSearchParams()`, it had to be split into an inner
  content component wrapped in `<Suspense>` by the default export — mirrors
  `repository/page.tsx`'s existing `<Suspense>` wrapper around `RepositoryBrowse`, the only other
  `useSearchParams()` consumer in the app; follow the same split-and-wrap shape if you add a third.
  The approval-letter-upload save (`handleLetterUpload`, same `ApprovalSection`) reuses the same
  mutation but deliberately omits `finalize` and has no `onSuccess` redirect — uploading a letter is
  incidental, not a decision, and must not approve the innovation or navigate away.
- **`ApprovalSection` is read-only once `innovation.reviewStatus !== 'SELECTED'`** — i.e. once an
  approval decision has actually been saved (or the innovation has moved on for any other reason:
  `APPROVED`, `REJECTED`, `PUBLISHED`, `ARCHIVED`). A single `isReadOnly` boolean gates: the
  Recognition/Mentor/Fund toggles swap for a new `ApprovalReadOnly` display component (a static
  approved/not-approved badge + the saved comment as plain text, styled to match `RequestBadge`'s
  existing badge look — no new visual language introduced), the letter-upload control disappears
  (replaced by "No letter uploaded." if none exists), and the error banner + "Save approval
  decisions" button are both hidden entirely — there is no disabled-but-visible state, per "Admin
  must not be able to enter, edit, or submit any input again." A small "Decision saved — read-only"
  pill (with a `Lock` icon) appears next to the section heading whenever `isReadOnly` is true.
  Because admins only ever reach this detail route via a link from the Pending or Reviewed tab (see
  above), and both only ever link to innovations already at `SELECTED` or later, this condition
  never has to account for earlier stages (`DRAFT`, `UNDER_REVIEW`, etc.) in practice.
- **`ImageUploadField`** (local to `dashboard/admin/page.tsx`, not exported — not a shared
  component in the `components/` sense, just reused across tabs within that one file) pairs a URL
  text input with a real file-upload button (`useUploadFile` → `POST /uploads`) and a live preview;
  used by both the News and Challenges admin tabs (`coverImageUrl`, `bannerImageUrl`). Takes an
  optional `placeholder` prop so the same field reads correctly for different image purposes — pass
  one rather than hardcoding new copy if you add a third usage. Every public render of an uploaded
  image (`NewsPost.coverImageUrl`, `Challenge.bannerImageUrl`) is conditional
  (`{value && <Image .../>}`) since the field is optional — never assume it's set.
- **Admin dashboard nav (`dashboard-shell.tsx`'s `NAV_ITEMS`) is role-filtered per entry, not
  per-page-owner** — the same route can be reached by multiple roles, or a role's sidebar can omit
  a link to a route its backend guard still permits (nav visibility ≠ API authorization). Current
  example: "Moderation" (`/dashboard/moderation`) shows only for `INSTITUTIONAL_COORDINATOR` even
  though the API still accepts `PLATFORM_ADMIN` on those endpoints too — a deliberate UX
  simplification, not a security boundary. Don't infer API permissions from what's in the sidebar;
  check [API.md](API.md) instead.
- **Long lists get grouped by month, not paginated**, where the data is naturally chronological
  and small enough (e.g. `app/[locale]/dashboard/admin/evaluations/page.tsx`'s shortlisted-by-
  evaluators list) — group client-side into a `Map<monthLabel, items[]>` built by iterating the
  already-server-sorted (`orderBy: submittedAt desc`) list once, so group order falls out of
  insertion order for free instead of needing a second sort.
- **Pending/Reviewed tabs over an already-fully-fetched list are filtered client-side, not via new
  query params**, when the underlying data is small/unpaginated and already carries the field the
  tab needs. Example (2026-08-11): the admin Evaluations page's Pending/Reviewed tabs read
  `Innovation.reviewStatus` (`SHORTLISTED` = Pending, `SELECTED`/`REJECTED`/`PUBLISHED`/`ARCHIVED`
  = Reviewed) directly off the data `useShortlistedEvaluations()` already fetches in full — no new
  endpoint or query param was added. This mirrors the *meaning* of the `reviewStatus=REVIEWED`
  pseudo-status pattern used server-side on the Preliminary/Authenticity Reviewer queues (see
  [API.md](API.md)), just applied client-side because this page has no pagination to preserve.
  Prefer this over adding backend filtering unless the list is paginated or too large to fetch in
  full — check first before assuming a new query param is needed.
- **Date range filters use plain `<input type="date">` pairs (From/To), not a date-picker
  library** — none is installed, and native date inputs already give a calendar UI with no time
  component for free, matching how the rest of the app avoids adding dependencies for things
  Tailwind + native HTML can already do. Make the range inclusive of both endpoints by comparing
  against local-time day boundaries (`${date}T00:00:00` / `${date}T23:59:59.999`), not the raw
  date strings — see `admin/evaluations/page.tsx`'s `filteredShortlisted` for the pattern
  (constrain each input's `min`/`max` to the other's current value too, so an invalid range can't
  be picked in the first place).
- **Read-only vs. editable ownership of a field can differ by page.** Example: Designation and
  Institution are shown read-only in the admin Users tab (`app/[locale]/dashboard/admin/page.tsx`)
  but are only editable from the user's own `/dashboard/profile` page — admins can see them, not
  set them. If you add a new profile field, decide (and document here) who's allowed to write it
  before wiring up an input for it.
- **Role-gated sections on an otherwise-public page reuse the API's existing role list, not a new
  one.** Example (2026-08-10): the public `/repository/[slug]` innovation detail page
  (`components/repository/innovation-detail.tsx`) shows an "Admin only"-badged panel with
  Preliminary/Authenticity reviewer notes and Expert Evaluator scores — but only fetches and
  renders it when the viewer holds `Role.PLATFORM_ADMIN`, the same role the underlying
  `GET /innovations/:id/review-comments` and `GET /evaluations/by-innovation/:id` endpoints already
  require (see [API.md](API.md)). The gate lives in the child component itself
  (`AdminFeedbackPanel`), not just conditional rendering, so the protected endpoints are never
  called by a non-admin viewer's browser in the first place. Pattern for the section itself: a
  full-width tinted band (`border-t border-ink-100 bg-ink-50/40`) below the main two-column layout,
  containing a card with a small `bg-brand-100 text-brand-700` "Admin only" pill in its header —
  reuse this instead of inventing a new "internal content" treatment. The panel also renders
  nothing at all until the innovation actually has feedback (no empty-state placeholder shown to
  admins on unreviewed innovations).

- **Mobile-responsiveness sweep (2026-08-25) — four recurring bug classes found and fixed
  app-wide, worth knowing before adding new layouts:**
  1. **Two-column layouts built with Tailwind's bracket/arbitrary `grid-cols-[Xpx_Ypx]` syntax
     need `min-w-0` on both grid-item children.** Standard `grid-cols-N` utilities are safe by
     default (Tailwind emits `minmax(0, 1fr)` tracks), but an arbitrary template like
     `lg:grid-cols-[1fr_320px]` emits the literal `1fr`/`320px` tracks with no `minmax(0, …)`. On
     mobile (below the `lg:` gate) there's no explicit template at all, so the browser falls back
     to a single implicit column — but CSS Grid's default per-item `min-width: auto` still applies,
     meaning any child with dense/unbreakable content (a `dl` of label/value pairs, a card with a
     badge row) can force that implicit column wider than the viewport, causing real horizontal
     overflow. Every `lg:grid-cols-[…]` two-column detail-page layout in the app
     (`innovation-detail.tsx`, `repository-browse.tsx`, `dashboard-shell.tsx`, and the three
     innovation-detail-style dashboard pages under `dashboard/{admin/evaluations,evaluations,
     innovations}/[id]`) now has `min-w-0` on both the main-content div and the `<aside>` — copy
     this whenever adding a new bracket-syntax grid, not just a plain `grid-cols-N`.
  2. **`shrink-0` on an action-button cluster stops the row from being squeezed, but does not make
     the buttons wrap.** A pattern like `<div className="flex items-center justify-between"><div
     className="min-w-0 flex-1">title</div><div className="flex shrink-0 gap-2">button button
     button</div></div>` looks like it should wrap on narrow screens (the button cluster even had
     its own `flex-wrap`), but `shrink-0` fixes that cluster's width to its own max-content size —
     wrapping only happens *within* an already-constrained width, and this div was never given
     one. Real bug found on `/dashboard/admin/repository`'s Publish/Unpublish/Archive/Media/
     Activity row (106px overflow) and, more subtly, `/dashboard/admin`'s Challenges tab row (no
     overflow, but the sibling title column got crushed to an unreadably narrow strip). Fix: change
     the cluster to `w-full sm:w-auto` (or `flex-wrap` + `w-full sm:w-auto sm:shrink-0` if it also
     needs desktop `shrink-0`) so it claims the full row on mobile — letting its own `flex-wrap`
     actually activate — and reverts to auto/content-width alongside the title at `sm:` and up.
  3. **Native `<select>`/`<input>` elements in filter/toolbar rows need explicit
     `w-full sm:w-auto`.** Chromium sizes an unconstrained `<select>` to its widest `<option>`
     regardless of container width — a "Category" filter with a long category name in its option
     list will overflow a narrow flex-wrap toolbar even though the wrapping div around it has no
     fixed width of its own. Fixed on the Category selects in `/dashboard/admin/evaluations` and
     `/dashboard/admin/repository`; applied the same `w-full sm:w-auto`/`sm:w-56` treatment to the
     Search input and Status select alongside it, and `min-w-0 flex-1 sm:flex-none` to the paired
     date-range inputs, for a consistent stacked-then-inline mobile→desktop toolbar shape. Copy
     this for any new filter bar.
  4. **An icon + filename link needs `shrink-0` on the icon and `min-w-0 truncate` on a `<span>`
     wrapping the text**, not just plain text after the icon — a long uploaded-file name (e.g.
     `watermarked_img_17328846700796394457.jpg`, no natural break points) otherwise forces the
     whole `<a className="flex items-center gap-2">` row wider than its container. Fixed on all
     four attachment-list renderers: `dashboard/innovations/[id]`, `dashboard/evaluations/[id]`,
     `dashboard/admin/evaluations/[id]`, and the public `repository/[slug]` detail
     (`innovation-detail.tsx`'s `AdminFeedbackPanel`-adjacent attachments list).

  None of these needed a new component or a design change — every fix stayed within the existing
  hand-rolled-Tailwind convention (see "No component-library convention" above). The two existing
  modals (`challenge-popup.tsx`, `confirm-dialog.tsx`, see the "Mobile-safe modal sizing pattern"
  entry above from the 2026-08-23 session) were re-verified working correctly and were not touched
  again in this session — that fix already held.

- **A `document.documentElement.scrollWidth > window.innerWidth` check is not sufficient to detect
  mobile overflow in this app — it can be silently masked by any `overflow-hidden` ancestor**
  (2026-08-25, found after the sweep above was reported complete, when the user caught a real clipped
  search button that this check had missed). Two independent things mask it here: (1)
  `home/hero.tsx`'s outer `<section className="overflow-hidden">` clips any overflow inside the
  hero column from ever reaching `documentElement`'s scroll size, and (2) the site-wide
  `challenge-popup.tsx` sets `document.body.style.overflow = 'hidden'` for as long as it's open
  (locking background scroll while the modal is shown, on every route it isn't gated off — see
  above), which has the same masking effect for the *entire* page, not just the hero, on a fresh
  session's first paint. A `scrollWidth`-gated audit script's per-element offender scan never even
  runs in either case, because the top-level `scrollWidth` check it's gated behind reports "no
  overflow" — so the underlying bug reads as clean when it isn't. Concretely this cost one real bug:
  `hero.tsx`'s search form (the `motion.div` text column is a child of the same
  `lg:grid-cols-[1.05fr_0.95fr]` bracket-syntax grid from pattern #1 above, and was missing its
  `min-w-0`) rendered its search button past the visible edge of the pill container on narrow
  phones, invisibly, with no scrollbar to reveal it. **Any future automated mobile-overflow check
  must scan every element's own `getBoundingClientRect().right` against `window.innerWidth`
  unconditionally — never gate that scan behind a `document.scrollWidth` pre-check — and must
  dismiss the challenge popup (click its "Maybe later"/close control) before measuring**, or it
  will silently miss anything clipped by `hero.tsx`'s section or by the popup's scroll lock. Also
  worth checking at 320px, not just 375px+ — the `/dashboard/investor` "Express interest" row (a
  fixed `w-48` message input beside a `shrink-0` button, no wrap) only overflowed at 320px, not
  375px, and was caught by re-running the corrected check at that width; fixed the same way as
  pattern #2 (`min-w-0 flex-1` on the input, `sm:w-48 sm:flex-none` to keep the desktop width).

- **Header government seal (`site-header.tsx`'s identity bar) is one fixed asset
  (`public/brand/govt-logo-en.svg`), deliberately not locale-switched** (2026-08-30) — despite the
  filename, it's used for both `en` and `bn`; toggling language must not change or replace it. An
  earlier version of this feature did switch by locale (`useLocale()` + a ternary to a
  `govt-logo-bn.svg` that was never actually created), but the user explicitly reversed that
  decision. Don't reintroduce per-locale logo switching here without checking first. Rendered
  `alt=""` + `aria-hidden` (decorative — the adjacent "Government of the People's Republic of
  Bangladesh" text already conveys the same information to screen readers), sized `h-5 w-5
  shrink-0 sm:h-6 sm:w-6` inside a `flex min-w-0 items-center gap-2` row ahead of the existing
  `truncate` text span.

## State & data-fetching conventions (relevant to UI work)

- **Zustand**, one store: `store/auth-store.ts` (`useAuthStore`, persisted to `localStorage` key
  `nir-auth`). Always gate UI that depends on auth state behind `hasHydrated` (see
  `useRequireAuth`) to avoid a logged-out flash during SSR/hydration.
- **React Query** for all server state (`app/[locale]/providers.tsx`; `staleTime: 30_000,
  retry: 1, refetchOnWindowFocus: false`). Domain hooks live one-per-domain in `src/hooks/*.ts`
  — add new data fetching there, not inline in page components, to match the existing pattern.

## i18n / bilingual rules

- Routing: `src/i18n/routing.ts` — `locales: ['en', 'bn']`, `defaultLocale: 'en'`,
  `localePrefix: 'as-needed'` (EN has no prefix, BN is prefixed `/bn/...`).
- **`localeDetection: false` (2026-08-31)** — next-intl's default behavior negotiates the locale
  from the browser's `Accept-Language` header on a visitor's first request, which was silently
  redirecting `/` to `/bn` for anyone with a Bangla-preferring browser despite `defaultLocale`
  being `en`. Disabled so `/` always serves English unless the visitor explicitly switches via
  `locale-switcher.tsx` (which still sets the `NEXT_LOCALE` cookie and is honored on later
  visits). If bilingual auto-detection is ever wanted back, this is the flag to revisit — do it
  deliberately, not as a side effect of an unrelated next-intl upgrade.
- Always import `Link`/`usePathname`/`useRouter` from `src/i18n/navigation.ts`, never directly
  from `next/link` / `next/navigation` — the wrapper is what makes them locale-aware.
- Messages: `apps/web/messages/en.json` and `messages/bn.json`, structurally identical key trees.
  Add a key to both files in the same change; a missing BN key doesn't crash but will
  silently regress the Bangla site.
- **No RTL logic exists or is needed** — Bangla is LTR. Bilingual support is a font-family swap
  (`font-bangla` vs `font-sans`, chosen in the root layout by `locale === 'bn'`) plus translated
  strings, nothing structural.

## Known gaps

- No shared component primitives (buttons/inputs/cards are hand-rolled per page) — a future
  consolidation candidate, tracked in [ROADMAP.md](ROADMAP.md).
- `darkMode` configured but unused (see Layout rules above).
- Two color palettes coexist (see Color palette above) — pick the NIR flat set for new work
  until/unless a consolidation decision is made.

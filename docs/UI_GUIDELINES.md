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
| `ui/` | `category-icon.tsx` (name→lucide-react icon map), `stage-pill.tsx` (colored badge for `DevelopmentStage`), `innovation-card.tsx` (repository grid card), `animated-counter.tsx` (count-up via Framer Motion), `file-upload-button.tsx` (wraps `lib/upload.ts`), `confirm-dialog.tsx` (2026-08-17 — blocking confirm modal for critical/destructive admin actions; first of its kind in this repo, reuse it rather than adding another `window.confirm`/bespoke modal) |
| `auth/` | `auth-card.tsx` (shared centered-card shell for sign-in/register), `sso-buttons.tsx` (disabled placeholder buttons) |
| `layout/` | `site-header.tsx`, `site-footer.tsx`, `locale-switcher.tsx` (EN/বাংলা pill toggle), `challenge-popup.tsx` (site-wide "running challenge" modal, see below) |
| `home/` | `hero.tsx`, `confluence-graphic.tsx` (decorative animated SVG), `stats-strip.tsx`, `quick-links.tsx`, `featured-innovations.tsx`, `category-grid.tsx`, `challenge-banner.tsx`, `news-section.tsx`, `partners-strip.tsx` — landing-page-only, each fetches its own data |
| `repository/` | `repository-browse.tsx` (search/filter UI, syncs query params), `innovation-detail.tsx` |
| `dashboard/` | `dashboard-shell.tsx` — the shared authenticated chrome (see below) |
| `reviews/` | `review-comment-timeline.tsx` — shared read-only comment list, reused across preliminary-review/authenticity-review/evaluation pages |

Two small chip-multi-select implementations exist independently (not extracted into a shared
component yet — a consolidation candidate): one inline in
`app/[locale]/dashboard/admin/page.tsx` (`EvaluatorDetails`/`PreliminaryReviewerDetails`/
`AuthenticityReviewerDetails`, for admin-assigned specialization categories) and a `ChipSelect`
inline in `app/[locale]/register/page.tsx` (for the sign-up form's optional sector-interest /
expertise-tag pickers). Same visual pattern (`border-brand-300 bg-brand-50 text-brand-800` when
active), written twice.

## Reusable patterns

- **Dashboard shell** (`components/dashboard/dashboard-shell.tsx`): every `/dashboard/*` route is
  wrapped in this via `dashboard/layout.tsx`. It provides: the auth guard (`useRequireAuth()`,
  redirects to `/sign-in` once hydration confirms no token), a fixed `240px` left sidebar
  (profile card + role-filtered nav via `NAV_ITEMS`, each entry optionally restricted to specific
  `Role`s), and a sign-out button. Individual role pages implement their own tabs/filters inline
  — there's no nested layout per role.
- **`StagePill`** mirrors badge classes also present in `nir.css` — if you touch one, check the
  other stays consistent.
- **No shared Modal/Toast/Sidebar primitive** — dialogs and toggles are built inline with local
  `useState` per component. If you need one of these more than once, that's a signal to extract
  it rather than copy the pattern again. The one modal in the app so far,
  `components/layout/challenge-popup.tsx`, follows this same inline-`useState` convention (no
  primitive extracted) — mounted once in `app/[locale]/layout.tsx` so it's site-wide, gated off
  `/dashboard`, `/sign-in`, `/register` via `usePathname()`, shown at most once per browser
  session per challenge (`sessionStorage`, keyed by `challenge.slug`) so it doesn't re-nag on
  every route change or reload. If a second modal need ever comes up, that's the point to extract
  a shared primitive from this one rather than copying it again.
- **Picking "the" running challenge among several `OPEN` ones** — both the homepage banner
  (`challenge-banner.tsx`) and the popup (`challenge-popup.tsx`) use the same selection rule:
  filter to `status === 'OPEN'`, then prefer the one the admin marked `isFeatured` (set from
  `/dashboard/admin`'s Challenges tab — a single-featured invariant enforced server-side, see
  [DATABASE.md](DATABASE.md#component-4--communication--cms)), falling back to the first OPEN
  challenge if none is featured. Reuse this exact fallback chain (`featured ?? first-open`) in any
  new UI that has to pick one challenge to highlight — don't invent a different tie-break.
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
  (`bg-sun-100 text-sun-700`, added 2026-08-17 alongside the Admin Repository Management module —
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

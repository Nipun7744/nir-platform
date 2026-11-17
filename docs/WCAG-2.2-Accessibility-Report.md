# WCAG 2.2 Level AA — Sign-in & Registration Accessibility Report

| | |
|---|---|
| **Scope** | `/[locale]/sign-in` and `/[locale]/register` (details step, verification-code step, both success screens), in English (`/en`) and Bangla (`/bn`) |
| **Standard** | WCAG 2.2, Level A + AA |
| **Date** | 2026-11-17 (session 49) |
| **Environment** | Local dev (Next.js dev server :3000, NestJS API :4000, PostgreSQL), Chrome, CAPTCHA = Cloudflare Turnstile with its always-pass test key, API started with `MAIL_TRANSPORT=console SMS_PROVIDER=console` so no real email/SMS was sent |
| **Result** | All issues found on these pages are fixed; automated checks report **0 issues** on all four page/language combinations (was 5 on sign-in, 14 on registration). Remaining items are listed in [§7](#7-remaining-issues-and-recommendations) — mostly outside the two pages or needing manual assistive-technology testing. |

---

## 1. Summary of changes

| Area | Before | After |
|---|---|---|
| Form labels | `<label>`s not tied to their inputs (no `for`/`id`) — screen readers announced "edit text" with no name | Every control has `<label for>`; hints and errors are linked with `aria-describedby`; invalid fields get `aria-invalid` |
| Error messages | Browser-native validation bubbles (in the browser's language, not the page's, gone after a second); server errors in English only, not announced | Form validates itself (`noValidate`): inline, translated messages under each field, focus moves to the first problem; server errors are mapped to Bangla/English, shown in a `role="alert"` region, and tied to the right field when they are about one field (email taken, bad phone, wrong code …) |
| Submit buttons | `disabled` until the CAPTCHA was solved — removed from the Tab order, with no explanation | Always focusable; pressing it explains what is missing. During a request the button is `aria-disabled` and a live region says "Signing in… / Sending code… / Verifying…" (was "…") |
| Input borders | `ink-100` on white = **1.34:1** | `ink-400` = **5.66:1**; error state `red-700` (6.47:1) plus a 1px ring |
| Verification-method cards | Selected state shown by colour only; selected border and focus ring `brand-300` = **2.06:1** | Radio dot indicator (not colour-only), borders `brand-600` / `ink-400` (≥ 5:1), focus ring `nirgreen-deep` (5.39:1) |
| Required fields | Not indicated | Visible `*` + "Fields marked * are required." note; `required` / `aria-required` for assistive tech |
| CAPTCHA | Unlabelled third-party box; load failure said "refresh the page" | Labelled group "Security check"; completed / expired / failed announced politely; can take focus when it is the outstanding problem; "Try again" button on load failure; widget localised (bn/en) |
| OTP input | Label OK, but no hint, no link to "code sent to …", errors not announced | Hint ("6 digits, you can paste"), `aria-describedby` → hint + "we sent a code to …", `autocomplete="one-time-code"`, numeric keypad, errors in `role="alert"`, wrong code is selected for quick retyping |
| Focus management | Focus lost to `<body>` when a step was swapped (back to details, success screens) | Focus moves to the new `<h1>`; on the code step to the code field; after "Stay on this page" to "Continue" |
| Automatic redirect | Success screen redirected after 1.5 s with no way to stop it | 5 s, visible countdown, "Continue" and "Stay on this page" (cancels the timer) |
| Page titles | Every page: "National Innovation Repository \| Bangladesh" | "Sign in \| …", "Create an account \| …", translated on `/bn` |
| Skip link | None — keyboard users tabbed through the whole header first | "Skip to main content" / "মূল বিষয়বস্তুতে যান" as the first Tab stop, site-wide |
| Sticky header (118 px) | Could cover a field focused by keyboard | Fields, the CAPTCHA group and the heading carry `scroll-margin-top` (144 px); verified a field behind the header scrolls clear when focused |
| Autocomplete | None | `name`, `email`, `username`, `tel`, `current-password`, `new-password`, `one-time-code`, `organization`, `organization-title` |
| Touch targets | Password toggle 44×42; "Change details" 20 px tall; inputs ~40 px | All controls ≥ 44 px tall; password toggle 44×44; chips ≥ 32 px |
| Password toggle | Name *and* state flipped ("Hide password, pressed") | One name ("Show password") + `aria-pressed`, `aria-controls` the field |
| Decorative images/icons | Logo alt duplicated the heading; icons exposed to AT | Logo `alt=""` (the `<h1>` names the site), all icons `aria-hidden` |
| Secondary text colour | `text-ink-500` — a class that **does not exist** in the Tailwind theme, so text fell back to the inherited colour | `text-ink-600` (11.2:1) on these pages (site-wide follow-up in §7) |
| Motion | Smooth scroll on step change regardless of OS setting | Instant scroll when `prefers-reduced-motion: reduce` |

---

## 2. Files changed

| File | Change |
|---|---|
| `apps/web/src/components/auth/auth-form.tsx` | **New.** `FormField` (label + hint + error + aria wiring), `FieldError`, `FormAlert` (`role="alert"`, optional `lang`), `StatusMessage` (polite live region), `RequiredNote`, `authInputCls`, `primaryButtonCls`, email / BD-mobile validators, `focusFirstError`, `useAuthErrorText()` (API error → translated text + field) |
| `apps/web/src/components/auth/auth-card.tsx` | Client component; `focusHeading` prop; `<h1 tabIndex=-1>`; subtitle `id="auth-card-subtitle"`; decorative logo; responsive padding |
| `apps/web/src/components/auth/password-input.tsx` | Fixed accessible name + `aria-pressed` + `aria-controls`; 44×44 toggle; darker icon |
| `apps/web/src/components/auth/captcha-widget.tsx` | Labelled focusable group, live status, inline error prop, `focus()` handle, retry on load failure |
| `apps/web/src/app/[locale]/sign-in/page.tsx` | Rebuilt on `FormField`; custom validation; translated errors; never-disabled submit |
| `apps/web/src/app/[locale]/register/page.tsx` | Same for both steps; server field errors kept separately; channel cards; focus management; stoppable redirect; reduced motion |
| `apps/web/src/app/[locale]/sign-in/layout.tsx`, `register/layout.tsx` | **New.** Translated `<title>` via `generateMetadata` |
| `apps/web/src/app/[locale]/layout.tsx` | Skip link; `<main id="main-content" tabIndex={-1}>` |
| `apps/web/messages/en.json`, `bn.json` | 40 new `auth.*` strings + `common.skipToContent`, in both languages |

No API or database changes. Existing behaviour is unchanged: CAPTCHA on every sign-in and before every code is sent, single-use tokens, resend cooldown, locked "Innovation Submitter" role, `next` return path, auto sign-in after verification.

---

## 3. WCAG 2.2 success criteria addressed

Status: ✅ meets (verified) · ➖ not applicable to these pages · ⚠ see §7.

| SC | Level | Title | Status | How |
|---|---|---|---|---|
| 1.1.1 | A | Non-text Content | ✅ | Decorative logo/icons hidden; CAPTCHA group has a text label; provider widgets supply their own alternatives |
| 1.3.1 | A | Info and Relationships | ✅ | `<label for>`, `fieldset/legend` for the verification method, labelled `role="group"` for CAPTCHA and chips, hints/errors via `aria-describedby` |
| 1.3.2 | A | Meaningful Sequence | ✅ | DOM order = visual order (verified Tab sequence) |
| 1.3.4 | AA | Orientation | ✅ | No orientation lock |
| 1.3.5 | AA | Identify Input Purpose | ✅ | `autocomplete` tokens on every personal-data field |
| 1.4.1 | A | Use of Color | ✅ | Required `*` + note; errors have icon + text; selected channel has a radio dot; links underlined |
| 1.4.3 | AA | Contrast (Minimum) | ✅ | Body text ink-700 (14.5:1), secondary ink-600 (11.2:1), errors red-700 (6.5:1), button text white on brand-600 (5.2:1) |
| 1.4.4 | AA | Resize Text | ✅ | Relative units; tested at 250 % zoom |
| 1.4.10 | AA | Reflow | ✅ | At 250 % zoom (= 320 CSS px) single column, no horizontal scroll |
| 1.4.11 | AA | Non-text Contrast | ✅ | Input borders 5.66:1, card borders ≥ 5:1, focus ring 5.39:1 |
| 1.4.12 | AA | Text Spacing | ✅ | WCAG spacing override applied — no visible content clipped, no horizontal scroll |
| 1.4.13 | AA | Content on Hover or Focus | ✅ | Only the native `title` tooltip on the password toggle |
| 2.1.1 | A | Keyboard | ✅ | Full sign-in and both registration paths completed with the keyboard |
| 2.1.2 | A | No Keyboard Trap | ✅ | None found (including around the CAPTCHA iframe) |
| 2.2.1 | A | Timing Adjustable | ✅ / ⚠ | Success redirect can be stopped; OTP expiry is a security limit with "Resend code" (see §7) |
| 2.3.3 | AAA | Animation from Interactions | (bonus) | Smooth scroll respects reduced motion |
| 2.4.1 | A | Bypass Blocks | ✅ | Skip link |
| 2.4.2 | A | Page Titled | ✅ | Page-specific, translated titles |
| 2.4.3 | A | Focus Order | ✅ | Logical order; focus moved deliberately on step changes |
| 2.4.6 | AA | Headings and Labels | ✅ | Descriptive `<h1>` per step; descriptive labels |
| 2.4.7 | AA | Focus Visible | ✅ | 2px `nirgreen-deep` ring with offset on every control (incl. sr-only radios via `:has(:focus-visible)`) |
| 2.4.11 | AA | Focus Not Obscured (Minimum) — *new in 2.2* | ✅ | `scroll-margin-top: 9rem` vs 118 px sticky header; measured |
| 2.5.3 | A | Label in Name | ✅ | Accessible names start with the visible label text |
| 2.5.7 | AA | Dragging Movements — *new in 2.2* | ➖ | No dragging |
| 2.5.8 | AA | Target Size (Minimum) — *new in 2.2* | ✅ | All targets ≥ 24×24 (most ≥ 44); inline text links are exempt |
| 3.1.1 | A | Language of Page | ✅ | `<html lang="en|bn">` |
| 3.1.2 | AA | Language of Parts | ✅ | Untranslated API text gets `lang="en"` on `/bn` |
| 3.2.1 / 3.2.2 | A | On Focus / On Input | ✅ | No context change on focus/input; choosing SMS only updates the phone label |
| 3.2.6 | A | Consistent Help — *new in 2.2* | ➖ | No help mechanism on these pages |
| 3.3.1 | A | Error Identification | ✅ | Inline text errors, `aria-invalid`, focus to first error |
| 3.3.2 | A | Labels or Instructions | ✅ | Labels, required marker, password / phone / code hints |
| 3.3.3 | AA | Error Suggestion | ✅ | Errors say how to fix it ("format name@example.com", "e.g. 01712345678", "at least 8 characters", "N attempts left", "wait N seconds") |
| 3.3.4 | AA | Error Prevention (Legal, Financial, Data) | ➖ | Account creation is not a legal/financial commitment; the code step confirms the email/phone and "Change details" allows correction |
| 3.3.7 | A | Redundant Entry — *new in 2.2* | ✅ | "Change details" keeps everything typed; resend doesn't re-ask anything |
| 3.3.8 | AA | Accessible Authentication (Minimum) — *new in 2.2* | ✅ / ⚠ | Paste and password managers work (correct `autocomplete`, no paste blocking); OTP can be pasted / auto-filled; show-password toggle. CAPTCHA: Turnstile is normally a non-interactive check; reCAPTCHA/hCaptcha (configurable) offer audio/accessibility alternatives — see §7 |
| 4.1.2 | A | Name, Role, Value | ✅ | Names on every control; `aria-pressed` toggles; labelled groups |
| 4.1.3 | AA | Status Messages | ✅ | `role="alert"` for errors, `role="status"` for progress, CAPTCHA state, "new code sent" |

---

## 4. How it was tested

1. **Baseline** (before any change) and **re-test** with an in-page checker written for this audit (no third-party code — loading axe-core from a CDN into the page was not permitted in this environment). It checks: programmatic labels, `autocomplete`, `aria-describedby` targets, input-border contrast (1.4.11), text contrast of every visible text node against its composited background (1.4.3), target size (2.5.8), image `alt`, unhidden decorative SVGs, duplicate ids, one `<h1>`, `lang`, title, skip link, live regions.
2. **Contrast** computed with the WCAG relative-luminance formula for every colour pair in the design tokens used here.
3. **Keyboard-only** walkthroughs in Chrome: skip link, Tab order, submitting with errors, correcting them, both registration paths, back navigation, success screens.
4. **Accessibility tree** inspected through the browser automation's tree (names, roles, states).
5. **Responsive**: 250 % zoom on an 802 px window (= 320 CSS px) for reflow; the browser window could not be made narrower than ~800 px, so real phone-width rendering was emulated, not measured on a device.
6. **Text spacing** override (line-height 1.5, letter 0.12 em, word 0.16 em, paragraph 2 em).
7. **End-to-end**: real sign-in and two real registrations (email in Bangla, SMS in English) against the local API with console delivery.
8. **Regression**: `tsc --noEmit` (web), API `auth-security.e2e.test.js`.

---

## 5. Test results

### 5.1 Automated checks

| Page | Before | After |
|---|---|---|
| `/en/sign-in` | **5** — 2 unlabelled inputs, 1 missing autocomplete, 2 input borders at 1.34:1; no live regions, no skip link, generic title | **0**; 3 live regions; skip link; title "Sign in \| National Innovation Repository" |
| `/en/register` | **14** — 4 unlabelled inputs, 3 missing autocomplete, 5 borders at 1.34:1, 2 unhidden decorative SVGs | **0** |
| `/bn/sign-in` | same markup as `/en` (5) | **0**; `lang="bn"`; title "সাইন ইন \| …" |
| `/bn/register` | same markup as `/en` (14) | **0**; `lang="bn"`; title "অ্যাকাউন্ট তৈরি করুন \| …" |
| `/en/register` at 250 % zoom | — | **0**; no horizontal overflow; every input 44 px tall, toggle 44×44, buttons 44 px |

Manual findings not caught by the checker (fixed): channel-card focus ring and selected border at 2.06:1, colour-only selection, focus lost on step changes, un-stoppable 1.5 s redirect, `disabled` submit, password toggle name/state conflict, browser-language validation bubbles, undefined `ink-500` colour.

### 5.2 Functional / keyboard scenarios

| # | Scenario | Lang | Result |
|---|---|---|---|
| 1 | First Tab shows "Skip to main content"; Enter moves focus into `<main>`; next Tab = first form field | bn | ✅ |
| 2 | Sign in with empty fields → focus on email, `aria-invalid`, described by "Enter your email address."; password error too | en | ✅ |
| 3 | Wrong password → alert "The email address or password is incorrect." | en | ✅ |
| 4 | Wrong password → "ইমেইল ঠিকানা বা পাসওয়ার্ড সঠিক নয়।" (translated, so no `lang="en"`) | bn | ✅ |
| 5 | Correct seeded credentials → `/dashboard` (functionality intact) | en | ✅ |
| 6 | Show-password toggle: name stays "পাসওয়ার্ড দেখুন", `aria-pressed=true`, field becomes text | bn | ✅ |
| 7 | Register with bad email / phone / 5-char password → 3 Bangla inline errors, focus on first (email), hints still read | bn | ✅ |
| 8 | Fixing each field clears its error live; CAPTCHA announces "নিরাপত্তা যাচাই সম্পন্ন হয়েছে।" | bn | ✅ |
| 9 | Send code → code step `<h1>`, focus in code field, `autocomplete=one-time-code`, described by hint + "code sent to a1****@example.com…" | bn | ✅ |
| 10 | Submit 3-digit code → "6-সংখ্যার কোডটি লিখুন।" on the field | bn | ✅ |
| 11 | Wrong 6-digit code → "যাচাইকরণ কোড সঠিক নয়। আর 4 বার চেষ্টা করা যাবে।", code selected for retyping | bn | ✅ (error then made `role="alert"` so it is announced while focus stays on the field) |
| 12 | Correct code → account created, focus on "আপনার অ্যাকাউন্ট প্রস্তুত", Continue + Stay buttons, auto-redirect to `/bn/dashboard` after 5 s | bn | ✅ |
| 13 | Choose SMS, no phone → label becomes "Phone number *", focus on phone, "Enter your mobile number to verify by SMS." | en | ✅ |
| 14 | SMS registration end-to-end; "Stay on this page" cancels the redirect (still on the page after 8 s) | en | ✅ (focus then lost — fixed: focus moves to "Continue"; re-verified by code review) |
| 15 | "Change details" from the code step → focus on the details `<h1>`, everything typed kept | en | ✅ |
| 16 | Requesting another code during cooldown → alert "Please wait 40 seconds before requesting another code." | en | ✅ |
| 17 | Already-registered email → error on the email field + focus | en | ❌ → fixed → ✅ (CAPTCHA reset re-ran validation and wiped the server error; server field errors now live in separate state) |
| 18 | Field scrolled behind the 118 px sticky header, then Shift+Tab to it → scrolled to y=144 (below header) | en | ✅ |
| 19 | Text-spacing override → no visible clipping, no horizontal scroll | en | ✅ |
| 20 | 250 % zoom (320 px equivalent) → single column, mobile header, no horizontal scroll | en | ✅ |

### 5.3 Regression

| Check | Result |
|---|---|
| `apps/web` `tsc --noEmit` | ✅ clean |
| `apps/api` `test/auth-security.e2e.test.js` (`.env` delivery) | ✅ 8 passed, 0 failed, 3 skipped (they skip when delivery is real) |
| Same with `MAIL_TRANSPORT=console SMS_PROVIDER=console` | ✅ **11 passed, 0 failed, 0 skipped** (after the rate-limit window — see §5.4) |
| ESLint | Not run — `apps/web` has no ESLint config (`next lint` starts its interactive setup) |

### 5.4 OTP e2e with console delivery

Run right after the browser tests, the 3 SMS cases first failed with **HTTP 429** — the `/auth/send-otp` throttle (10 requests per minute) had been used up by the manual tests, not a code fault. Re-run after the window reset: **11 passed, 0 failed, 0 skipped** (send code, resend cooldown, wrong / right / reused code, 5-attempt lock, non-BD number rejected, phone stored normalised).

---

## 6. Design rules for future auth / form work

- Use `FormField` + `authInputCls` (or the same pattern) for any new field: never a bare `<label>` without `for`.
- Don't `disable` a submit button to signal "not ready" — validate on submit and explain.
- Errors: inline under the field, linked by `aria-describedby`, plus focus on the first one; form-level errors in `FormAlert`.
- New API error messages should be added to `useAuthErrorText()` with en + bn strings; otherwise they show in English marked `lang="en"`.
- When content is swapped without navigation, move focus (`AuthCard focusHeading`).
- Borders of inputs and selected states: `ink-400` / `brand-600` or darker. Focus ring: the shared `focus-ring` class.
- Anything focusable near the top of a page under the sticky header: add `scroll-mt-36`.

---

## 7. Remaining issues and recommendations

| # | Issue | Impact | Recommendation |
|---|---|---|---|
| 1 | **`ink-500`, `ink-300`, `ink-200` are not defined** in `tailwind.config.ts`, but `text-ink-500` etc. are used across the site. Those classes generate no CSS, so the text takes the inherited colour (usually darker than intended — contrast is fine, design intent is lost). Fixed only on the auth pages. | Visual consistency site-wide | Define the missing steps (e.g. `ink-500: #3a5470` ≥ 7:1) and check contrast, or replace the classes |
| 2 | **Real screen-reader testing not done** (NVDA/JAWS on Windows, TalkBack on Android, VoiceOver on iOS/macOS). Verified through the accessibility tree and ARIA wiring only. | Medium — announcement wording/timing can differ per reader | One manual pass per reader before sign-off, in both languages |
| 3 | **CAPTCHA internals are third-party.** Turnstile (current) is usually non-interactive, but if Cloudflare decides to show an interactive challenge its accessibility is Cloudflare's. reCAPTCHA v2 image challenges have an audio alternative; hCaptcha offers an accessibility cookie. The test key renders a red "For testing only" line inside the iframe — only with the test key. | 3.3.8 relies on the provider's alternative | Keep Turnstile (least cognitive load). Document a support contact for people who can't pass the check |
| 4 | **OTP expiry (5 min) and resend cooldown (60 s)** are fixed time limits. They are security limits with a way to continue ("Resend code"), which is the usual reading of the 2.2.1 security/essential exception; the resend countdown is visible but not announced. | Low | Optionally announce "You can request a new code now" once, when the cooldown ends |
| 5 | **Shared header/footer not audited** beyond the skip link (e.g. the top bar's small text and language switch). | Unknown | Separate audit of `site-header.tsx` / `site-footer.tsx` |
| 6 | **Phone-sized screens were emulated**, not measured: Chrome would not go below ~800 px, so 320 px was tested as 250 % zoom. | Low | Check on a real Android/iOS device |
| 7 | **CAPTCHA load-failure path ("Try again") and the "Stay" → focus fix** were verified by code review, not by forcing the failure in the browser. | Low | Block `challenges.cloudflare.com` in DevTools and retest |
| 8 | Bangla messages show Western digits for counts (e.g. "আর 4 বার") and the Bangla `<title>` keeps the English site name. | Not a WCAG failure | Localise digits/site name if desired |
| 9 | Unmapped API errors still appear in English (marked `lang="en"`). | Low | Add new messages to `useAuthErrorText()` as they appear |
| 10 | Hidden role-specific fields (Investor/Mentor/Ministry, behind `SELF_SERVICE_ROLES_AT_SIGNUP = false`) were updated to the same pattern but can't be exercised in the UI today. | None now | Test if the flag is turned on |

### Test data left in the local database
Two test accounts were created by the end-to-end tests (`a11y-test-1117@example.com`, `a11y-sms-1117@example.com`, active Innovation Submitters). They are harmless local data; delete them if not wanted.

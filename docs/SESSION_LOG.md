# Session Log — NIR Platform

> Chronological log, newest entry on top. Add one entry at the end of every working session:
> date/time, what was done, files touched, decisions made, bugs fixed, and next steps for
> whoever (human or Claude) picks this up next.

---

## 2026-11-18 (session 53) — Configurable challenge details fields

**What:** Platform admin → Challenges → Create / Edit challenge: the challenge details fields are
now fully configurable per challenge. Admins add, reorder, retype and remove fields and set each
one's **section / level**, **label**, **input type**, **placeholder**, **help text**, **options** and
**validation rules** in English and Bangla, then fill in its value on the same card.

Earlier in the session: on the Bangla challenge details page the timeline heading
`challengeDetail.timeline` changed from সময়রেখা to সময়সীমা (`apps/web/messages/bn.json`). The
user also edited some message strings by hand: topbar org name, and "Objective"/উদ্দেশ্য and
মূল্যায়ন পদ্ধতি for two section titles. Their section-title wording was carried into the new
default fields.

**Decisions (asked the user):**
- **Per-challenge fields**, not a shared template. Each challenge owns its list.
- **No default fields** (user follow-up: "no need of top 5, make it clean"). A new challenge
  starts with an empty list and every field is created by the admin. The first version prefilled
  the five old sections and had a "Restore standard sections" button; both were removed.
- **Convert the five fixed sections into fields and migrate their content.** Objective, Who can
  apply, How submissions are evaluated, Prizes & support and Additional information become
  ordinary editable fields. Timeline, attachments, FAQ and contact stay structured lists.

**Changes:**

1. **Shared rules** — `packages/shared/src/challenge-detail-fields.ts` (exported from `@nir/shared`):
   - Types and constants: 11 input types and limits (no default field list).
   - `normalizeDetailFields` (trim, rebuild key by key, drop settings that don't fit the type,
     generate unique keys), `validateDetailFields` (set-up and value checks) and
     `publicDetailFields`.
   - Both the API and the admin form use this module, so their errors always match.
2. **DB** — migration `20261118100000_challenge_detail_fields` (hand-written):
   - Adds `Challenge.detailFields JSONB`.
   - For each challenge, turns every old section **that has text** into a field. Empty sections
     are not carried over; a challenge with none gets `NULL`.
   - The migration was rewritten after the first local run (it no longer adds empty sections or
     placeholders). It was dry-run on a temporary copy of the backed-up columns, the local DB was
     cleaned to match, and the stored checksum was updated.
   - Drops the 10 old columns.
   - Applied locally to 10 challenges. Content checked after migrating, and a pre-migration
     backup of the old columns was saved to the session scratchpad.
3. **API** — `challenge.dto.ts`: `detailFields?: unknown[]` (≤ 50) replaces the 10 text fields.
   `challenges.service.ts`:
   - Saving runs `toDetailFields` (normalize, then validate, then a 400 listing up to 5 problems).
   - Public reads go through `withPublicDetails`: filled fields only, without placeholder, help
     text or validation.
4. **Web, admin side:**
   - New `components/admin/challenge-detail-fields-editor.tsx`.
   - `dashboard/admin/page.tsx`: "Challenge details fields" panel in Create and Edit.
     `emptyChallengeForm()` starts with the defaults, and Create/Save are disabled while there are
     issues (`IssueNote`).
   - The old fixed textareas and their Bangla copies are removed.
   - The remaining collapsible is renamed "Timeline, attachments, FAQ, contact & Bangla basics".
5. **Web, public side:**
   - `challenges/[slug]/page.tsx` renders the fields after Overview, grouped by section, each
     rendered by its type and in the visitor's language.
   - Timeline, Attachments and FAQ follow the fields.
   - The prize headline chip was removed from the body; the sidebar still shows it.
   - Removed the now-unused `challengeDetail.problemStatement/eligibility/evaluationCriteria/prizes/
     additionalInfo` keys (en + bn). `ChallengeDto.detailFields` added in `use-content.ts`.
6. **Demo** — `scripts/demo-full-challenge.js` now sends `detailFields`: the five sections plus an
   "At a glance / এক নজরে" group (checkboxes, number, dropdown). The local demo challenge was
   patched to match.

**Tests:**
- New `test/challenge-detail-fields.test.js` (8 unit tests) and
  `test/challenge-detail-fields.e2e.test.js` (6), both added to the npm scripts.
- Full suites pass: `npm test` 64/64 and `npm run test:e2e` 62/62 (API in console mail/SMS mode).
- Web `tsc --noEmit` is clean.
- Browser checks:
  - The Create form starts empty ("No fields yet…"), at desktop and ~500 px wide; no horizontal
    scroll.
  - Add field, set-up, dropdown options in en/bn, required: inline errors appear and clear, and
    Create stays disabled until they're fixed.
  - Edit loads the demo's 8 fields.
  - Public demo page in en and bn: grouped "At a glance" section, ticked list, number, option text.

**Bugs found and fixed during the session:**
- Blank Bangla option text was stored as `bn: undefined`; it is now omitted.
- The editor's section heading id was duplicated when Create and Edit were both open; it now uses
  `useId`.

**Next steps:**
- **Deploying:** back up the server DB before `prisma migrate deploy` (this migration drops
  columns). Deploy API and web together: an old web build shows no detail sections against the
  new API, and the new web build shows none against the old API.
- Checked the editor at about 500 px wide; a 375 px pass of the public sections is still worth
  doing.
- Optional ideas: duplicate a field; copy fields from another challenge.

**Follow-up (shipped in 920e59d):** dates now use full month names everywhere: `month: 'short'` →
`'long'` in 13 web files (challenge pages, banner, popup, news, admin lists, outreach). The month
names come from the browser's locale data, not the message files. Banner and popup were checked in
en and bn.

**Follow-up: dynamic contact fields (shipped in 920e59d).** "Contact for questions" in
the admin challenge form is now fully dynamic. Admins create every contact field (e.g. Name,
Email, Phone, WhatsApp, office hours) with the same editor and rules as the details fields, but
with no Section setting. It starts empty.
- **Decision (user):** first built as extra fields under the fixed Name / Email / Phone inputs; the
  user asked to drop the three fixed inputs ("make this clean").
- **DB:** migration `20261118120000_challenge_contact_fields` adds `Challenge.contactFields`, turns
  each filled `contactName`/`contactEmail`/`contactPhone` into a field (EMAIL/PHONE type only when
  the value passes that rule, else SHORT_TEXT), then drops the three columns.
  - It was rewritten after a first, additive-only local run. Locally it was dry-run on a temp copy
    (all migrated values pass the field rules) and the same result was applied (3 challenges had
    contact data). The checksum was updated, and the old values were backed up to the session
    scratchpad.
- **API:** DTO and `toContactFields` (validate, then drop sections; 400 "Contact fields: …");
  public reads strip the set-up, as for details fields.
- **Editor:** gained `showSection` / `addLabel` props. Create/Save count issues from both lists.
- **Public page:** the Contact card shows only contact fields, and only when one is filled.
- **Demo:** the demo script and local demo challenge have Name, Email, Phone, WhatsApp and office
  hours as contact fields.
- **Tests:** one new e2e test case (`challenge-detail-fields.e2e.test.js`, now 7).
- **Browser:** public Contact card checked in en and bn; admin Create shows an empty "Contact for
  questions" with "Add contact field"; set-up has no Section setting.

**Shipped:** code commit b3e553a plus this docs commit, pushed to GitHub `master` and GitLab `development` (cherry-picked onto the team's branch). Servers still need a DB backup, then `prisma migrate deploy`.

**Files:**
- `packages/shared/src/{challenge-detail-fields.ts,index.ts}`
- `apps/api/prisma/{schema.prisma,migrations/20261118100000_challenge_detail_fields/}`
- `apps/api/src/challenges/{challenges.service.ts,dto/challenge.dto.ts}`
- `apps/api/scripts/demo-full-challenge.js`
- `apps/api/test/challenge-detail-fields{,.e2e}.test.js`
- `apps/api/package.json`
- `apps/web/src/components/admin/challenge-detail-fields-editor.tsx`
- `apps/web/src/app/[locale]/{dashboard/admin/page.tsx,challenges/[slug]/page.tsx}`
- `apps/web/src/hooks/use-content.ts`
- `apps/web/messages/{en,bn}.json`
- `docs/{API,DATABASE,PROJECT_CONTEXT,UI_GUIDELINES,ROADMAP,SETUP,SESSION_LOG}.md`

---

## 2026-11-18 (session 52) — Admin: challenge participant export (.xlsx) + bulk email/SMS

**What:** new admin page **Participants & messaging** (`/dashboard/admin/outreach`) for Platform +
System admins: choose a challenge → see its participants → download Excel → send a bulk email or
SMS (placeholders, recipient review, admin OTP confirmation) → communication log.

1. **DB** — migration `20261118042607_bulk_messaging`: `BulkMessage`, `BulkMessageRecipient`, enums
   `MessageChannel`/`BulkMessageStatus`/`BulkRecipientStatus`, `OtpPurpose.BULK_MESSAGE_CONFIRM`.
2. **API** — new `apps/api/src/outreach/` (`OutreachModule`: controller, `ParticipantsService` incl.
   the exceljs workbook, `BulkMessagesService` incl. the paced worker, pure `message-template.ts`,
   `bulk-email.ts`, DTOs). `messaging/templates/branded-layout.ts` extracted from the OTP email so
   bulk emails share it; `otp-email.ts` rebuilt on it (+ copy for the new purpose).
   `SmsService.send(to, text, 'otp'|'bulk')` + `bulkAvailable`, new env `SMS_TELETALK_BULK_SMS_CLASS`/
   `_ID`; env `BULK_*`. `AuthModule` exports `OtpService`. CORS exposes `Content-Disposition`.
   New dependency `exceljs` 4.4.0.
3. **Web** — page + `components/admin/outreach/*`, `hooks/use-outreach.ts`, `apiDownload()` in
   `lib/api-client.ts`, nav item, `outreach.*` strings (en + bn).
4. **Tests** — `test/outreach-rules.test.js` (10 unit) added to `npm test`; `test/outreach.e2e.test.js`
   (11) added to `npm run test:e2e`. Browser walk-through on a throwaway challenge (deleted after):
   participant list + dedupe, real .xlsx download opened and checked, validation, review,
   wrong/right admin code, live progress, delivered history + recipient detail, Bangla UI + Bangla
   SMS review, 375 px layout.

**Decisions:** participants = distinct non-draft submitters (team members without their own
submission excluded); PLATFORM_ADMIN + SYSTEM_ADMIN (same as submission monitoring); admin OTP
goes to the admin's own account email/phone and is checked *after* all guards; triple duplicate
protection (request key, 24 h same-content guard with explicit override, one running send per
challenge+channel) plus a unique (message, user) row; in-process paced worker (resumes after
restart); inactive accounts and invalid addresses are skipped and shown, never silently dropped;
Excel dates written in Bangladesh time; bulk SMS disabled on Teletalk until a non-OTP class is set.

**Bugs found and fixed during testing:** filename lost on download (CORS didn't expose
`Content-Disposition`); Excel dates were UTC; the export box squeezed the participant table; a
nested component remounted and lost focus; wrong code wasn't selected for retyping; an `sr-only`
header label made the whole page scroll sideways on phones (`relative` on scroll wrappers).

**Shipped:** sessions 50–52 committed together (code + docs) and pushed to GitHub `master` and GitLab
`development` on 2026-11-18. The two `docs/WCAG-2.2-*` reports were found deleted in the working
tree (not by this session) and were left out of the commit.

**Next steps:** get the Teletalk non-OTP class for bulk SMS; `prisma migrate deploy` on servers
(migrations 27 + 28); consider a "retry failed recipients" action and an opt-out list (ROADMAP).

---

## 2026-11-18 (session 51) — Branded HTML template for every OTP email (en + bn)

1. **New** `apps/api/src/messaging/templates/otp-email.ts` — `renderOtpEmail({ purpose, code,
   minutes, locale })` → subject, plain text, HTML, inline-logo attachment. Copy per `OtpPurpose`
   (REGISTRATION = "Account verification / Verify your email address", PASSWORD_RESET = "Password
   reset / Reset your password") in English and Bangla; one layout. **New**
   `templates/nir-logo.ts` (logo PNG as base64, generated from the SVG with sharp).
2. `messaging/mail.service.ts`: `OutgoingMail.attachments` (`MailAttachment`, supports `cid`).
3. `auth/otp.service.ts`: the email branch of `deliver()` now just calls `renderOtpEmail`; the two
   inline HTML snippets are gone. **SMS unchanged.**
4. **New** `apps/api/scripts/preview-otp-emails.js` — writes all variants to `.logs/email-preview/`.

**Tests:** auth-security e2e 11/11, password-reset e2e 14/14, unit 46/46 (API in console mode).
Browser previews at desktop, 375px and 320px. Real sends: 4 `[TEST]` emails (both purposes × en/bn,
dummy code) through the a2i SMTP account to the developer's Google Workspace inbox, with the user's
OK — all in Inbox, layout/logo/Bangla correct in Gmail web, logo not shown as an attachment.

**Decisions:** logo as CID inline image (Gmail/Outlook block SVG and data: URIs; no reliable public
asset URL across environments); copy typed by `OtpPurpose` so a new purpose can't ship without
en+bn email text; no links in the email (nothing to click needed for an OTP, and fewer phishing
lookalikes).

**Next steps:** check the `[TEST]` emails in Outlook desktop, Apple Mail and the phone mail apps
(ROADMAP Known issues). If the logo ever changes, regenerate `nir-logo.ts` (UI_GUIDELINES.md).

---

## 2026-11-18 (session 50) — Forgot password (email/SMS OTP), en + bn

Started 09:15 by running the project (API via `tsc` + `node dist/main.js` per SETUP.md, web via
`npm run dev`), then implemented forgot password end to end. Finished ~09:45.

1. **API** (`apps/api/src/auth/`):
   - Migration `20261118032340_password_reset_otp`: `OtpPurpose` gains `PASSWORD_RESET`.
   - `otp.service.ts`: `deliver()` takes the purpose — reset emails/SMS say "password reset code"
     (en SMS 58 bytes; bn SMS unchanged because of Teletalk's 70-byte limit).
   - `auth.service.ts`: `findResetAccount` (case-insensitive email / any stored phone spelling;
     404 if none, 403 if inactive), `sendPasswordResetOtp`, `verifyPasswordResetOtp` (→ 10-min
     reset JWT), `resetPassword` (confirm match, must differ from current, argon2, revoke all
     refresh tokens, mark channel verified, audit `PASSWORD_RESET`).
   - `auth.controller.ts`: `POST /auth/password/forgot` (10/min), `/verify-code` (20/min),
     `/reset` (10/min). New `dto/password-reset.dto.ts`; step 1 reuses `SendOtpDto`.
2. **Web**: new `app/[locale]/forgot-password/{page,layout}.tsx` (4-step AuthCard flow);
   "Forgot password?" link under the sign-in password field; `useForgotPassword`,
   `useVerifyResetCode`, `useResetPassword` (clears the local session on success) in
   `hooks/use-auth.ts`; new error mappings in `useAuthErrorText`; 34 new `auth.*` strings in
   `messages/en.json` + `bn.json`; `/forgot-password` added to the challenge popup's hidden routes.
3. **Tests**: new `apps/api/test/password-reset.e2e.test.js` (14 tests, all pass) and added to
   `npm run test:e2e`. Regression: `auth-security.e2e` 11/11, unit tests 46/46. Browser
   walk-through (en) with a throwaway user, since deleted: empty field, unknown email, code sent,
   wrong code ("4 attempts left"), correct code, short + mismatched passwords, same-as-current
   password, success screen, sign-in with the new password. Bangla page checked visually.

**Decisions:** reuse `OtpService` rather than a reset-link system; stateless reset token
(derived signing key so it can't act as an access token; password-hash fingerprint makes it
single-use); explicit "no account registered" errors, consistent with registration; reset revokes
every session; no auto sign-in after reset.

**Bug fixed during the work:** server field errors on the new page vanished a moment after
showing, because the CAPTCHA re-solve after `reset()` re-ran client validation into the same
state. Fixed by keeping server errors separate (pattern noted in UI_GUIDELINES.md).

**Next steps:** run `prisma migrate deploy` on servers when this ships (migration 27). Follow-ups
are in ROADMAP.md › Technical debt › "Forgot password follow-ups" (no password-changed
notification yet, no signed-in change-password screen, email-case inconsistency with login).

---

## 2026-11-17 (session 49) — "Attachments" label; conditional form fields; admin edit; submit-page title

1. **Admin → create/edit challenge:** the file/link fieldset legend "Resources — guidelines,
   templates (upload a file or paste an https:// link)" now reads "Attachments — guidelines,
   templates (…)" (`apps/web/src/app/[locale]/dashboard/admin/page.tsx`). Label text only; the
   underlying `resources` field/API shape is unchanged.
2. **Conditional fields in challenge submission forms** (admin-configurable, no code changes per
   challenge): any field can be set to "show only when <earlier dropdown/radio/checkbox> is
   <option(s)>". Chains work (a conditional checkbox can itself control later fields).
   - DB: migration `20261117053614_challenge_field_conditions` adds
     `ChallengeFormField.showIfFieldKey` + `showIfValues` (additive).
   - API (`challenge-rules.ts`): `normalizeFormDefinition` accepts `showIfFieldIndex` (or
     `showIfFieldKey`) + `showIfValues`, resolves to the controller's key, and rejects conditions on
     a later field / non-choice field / unknown option. `validateResponses` skips hidden fields
     (not required, answer dropped). New exported `conditionMet()`. DTO gains the three fields.
   - Web: `visibleFieldKeys()`/`visibleValues()` in `challenge-form/types.ts`; `DynamicForm` and
     `validateDynamicForm` honour them; the submit page sends only visible answers; the form
     builder has a "Conditional display" editor, row summaries, broken-condition warnings, and
     clears conditions when their controller is deleted.
   - **Decision:** a field may depend only on a field *above* it — no cycles, and one pass in form
     order settles visibility on both client and server. Conditions point at the controller by
     key (stored) / payload index (on save), not by FK, since the form is replaced on every save.
   - Tests: 6 new unit tests in `challenge-rules.test.js` (46/46 pass), 1 new e2e test in
     `challenge-submissions.e2e.test.js` (13/13 pass against the local API). Browser-checked on a
     throwaway challenge (since deleted): fields appear/disappear on the submit page, chained
     condition works, builder shows the condition and the "now below it" warning.
   - **Next steps:** run `prisma migrate deploy` on the servers when this ships. Options shown
     in the condition editor are the English ones (answers are stored in English, so that's what
     conditions match on). Reviewer views are unchanged — hidden fields simply have no entry.
3. **File fields no longer show "Max N MB."** under the picker (`challenge-form/dynamic-form.tsx`,
   user request). The "“name” is larger than N MB." error still appears when a chosen file is over
   the limit (checked before upload). Single-file fields now show only "Accepted: …" (or nothing if
   any type is allowed); multi-file fields show "Accepted: … Up to N files.". i18n: `maxSize` /
   `maxSizeMulti` replaced by `maxFilesHint` in `messages/en.json` + `bn.json`.
4. **Full demo challenge + end-to-end test (kept, not cleaned up — user request).** New script
   `apps/api/scripts/demo-full-challenge.js` (run from `apps/api`, API on :4000) creates/refreshes
   the published, OPEN challenge `demo-smart-bangladesh-innovation-challenge-2026` ("Smart Bangladesh
   Innovation Challenge 2026 (Demo)"): every details section in English + Bangla, generated banner,
   5 timeline phases, 3 FAQs, 3 attachments (2 uploaded PDFs + a link), custom button label, first
   category by `sortOrder`, `isFeatured: false` (so the real featured challenge's popup is
   untouched). Its form has 20 fields covering all 11 types, 4 mapped fields, Bangla text/options,
   and 7 conditional fields (incl. a chain: Support needed → Funding amount). The script then tests
   public visibility, validation (empty / bad formats / conditional-required), two real submissions
   on different branches, stored snapshots (hidden answers dropped), attachments, review queue,
   response visibility, and admin monitoring. **Result: 28/29 on the first run**; the one failure
   was the test, not the app — `innovator3@nir.gov.bd` also holds `EXPERT_EVALUATOR` (+
   `INSTITUTIONAL_COORDINATOR`) in the local DB, so seeing responses is correct. The script now uses
   innovator2 (innovator-only) for that check; re-checked separately: 404, no responses. Kept in the
   local DB: the challenge and submissions **NIR-2026-000087** (innovator1) and **NIR-2026-000088**
   (innovator2), both UNDER_REVIEW. Browser-checked the details page (EN) and the submit form (BN):
   Bangla labels/options, custom button label, conditional fields, no size hint under file fields.
   Re-running the script updates the challenge in place but adds two more submissions each time.
5. **WCAG 2.2 AA — sign-in & registration (en + bn).** New `components/auth/auth-form.tsx`
   (FormField / FormAlert / StatusMessage / validators / `useAuthErrorText`); rewrote
   `sign-in/page.tsx` and `register/page.tsx` on it; `AuthCard` focus management + decorative logo;
   accessible `PasswordInput` and `CaptchaWidget` (labelled group, live status, retry); new
   `sign-in/layout.tsx` + `register/layout.tsx` (translated titles); site-wide skip link in
   `[locale]/layout.tsx` (`<main id="main-content">`); 40 new `auth.*` strings + `common.skipToContent`
   in en/bn. No API/DB changes. Automated checks 5 → 0 (sign-in) and 14 → 0 (register) in both
   languages; 20 keyboard/end-to-end scenarios pass (two bugs found during testing and fixed:
   server field errors wiped by CAPTCHA reset; focus lost after "Stay on this page"); API
   `auth-security.e2e` 11/11 with console delivery. Testing used an API restarted with
   `MAIL_TRANSPORT=console SMS_PROVIDER=console` (no real email/SMS); the normal API was restarted
   afterwards. Local test accounts left: `a11y-test-1117@example.com`, `a11y-sms-1117@example.com`.
   axe-core couldn't be loaded (CDN script injection not permitted), so a self-written in-page
   checker was used. Report: `docs/WCAG-2.2-Accessibility-Report.md`. **Next:** real screen-reader
   passes, header/footer audit, define the missing `ink-500` colour (ROADMAP known issues).
6. **Landing page accessibility (WCAG 2.2 AA target, no visual change).** Header (aria-current,
   translated labels, mobile menu aria-controls + Escape), locale switcher (aria-pressed), footer
   (h2, named navs, focus rings, lang), popup (focus to panel, Tab trap, Escape, focus return, dialog
   role on the panel), hero search (search landmark, label, keyboard focus ring — was invisible),
   headings/lists/landmarks across home sections, `AnimatedCounter` real value for AT, spoken category
   counts, `lang` on English DB content on /bn (new `lib/text-lang.ts`), localised home title,
   `MotionConfig reducedMotion="user"`, `scroll-margin-top` for focusables in main; 14 new en/bn strings.
   **Verification:** visual fingerprints (every visible text run + image) identical before/after in
   en desktop/tablet/phone and bn desktop/phone (one regression found and fixed: `min-w-0` on wrapped
   cards); popup/menu/search/language switch tested by keyboard; tsc clean. **Not claimed fully
   conformant:** placeholder contrast 3.08:1 and infinite animations (2.2.2) left for a design decision;
   no real screen reader / device testing; axe-core unavailable. Report:
   `docs/WCAG-2.2-Landing-Page-Accessibility-Report.md`.
7. **Decisions on the landing-page open items:** (1) approved — hero search placeholder `#8494AC` →
   `#66768F` (3.08 → 4.61:1), the only visual change; (2) declined — the infinite decorative
   animations stay (2.2.2 remains not strictly met; documented in the report and ROADMAP).
8. **Admins can edit published innovations.** "My innovations" only showed Edit for drafts, and the
   API refused an owner's edit after submission even when the owner was an admin (it already let
   admins edit *other people's*). Now `PLATFORM_ADMIN`/`SYSTEM_ADMIN` can edit any innovation at any
   status (`InnovationsService.update`); web uses new `lib/innovation-permissions.ts`
   (`canEditInnovation`, `canSubmitForReview`) on the list, manage page (Edit, attachments, team) and
   edit page ("Edit innovation" + a note that published changes go live; status unchanged). "Ready
   for review?" stays DRAFT/REJECTED-only; challenge submissions stay non-editable; Delete stays
   draft-only. The update hook now refreshes every `['innovation', …]` query (public page is cached
   by slug). Verified: API admin-own-PUBLISHED 200 / innovator-own-PUBLISHED 400; browser — 32 Edit
   buttons for the admin, edit page opens and saves, manage page shows Edit without "Ready for review".
9. **Challenge submit page: name shown once.** The heading was "Submit an innovation – {title}" and
   the green banner repeated the title under a "Submitting to challenge" label plus the organiser.
   Now the heading is just "Submit an innovation" / "উদ্ভাবন জমা দিন" and the banner shows only the
   text "Submission Form – {challenge name}" / "জমাদান ফর্ম – {name}" (key `formTitle`; trophy icon
   decorative). Then, on request, the "Submit an innovation" heading was removed entirely: the green
   box is now the page's `<h1>` on the form view (a `<p>` on the success view, whose success message
   is the `<h1>`). Removed the unused `banner` and `heading` keys (en/bn).
10. **Challenge details page: "Resources" → "Attachments".** Only `challengeDetail.resources` changed
    (en "Attachments", bn "সংযুক্তি"), which drives both the section heading and its in-page nav link;
    the site-wide "Resources" nav item (`nav.resources`) is unchanged. Matches the admin form legend
    ("Attachments — …", item 1). Verified in both languages.
   Verified in the browser in both languages.

---

## 2026-11-16 (session 48) — removed GitLab CI/CD; evaluator view trimmed for challenge submissions; full workflow test + fixes

1. **Deleted** `.gitlab-ci.yml` (verify → SSH deploy → smoke, manual rollback), `deploy/deploy.sh`
   (backup + health-checked compose deploy + auto-rollback) and `.gitattributes` (it only forced
   LF on `*.sh`, and no shell scripts remain).
2. **Kept:** `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`, `.dockerignore`
   (the server runs the stack with them) and the GitHub → Vercel integration (configured in Vercel,
   not code in the repo).
3. **Docs:** SETUP.md's CI/CD section replaced by a short manual deploy procedure; the ROADMAP
   tech-debt note and SETUP's env note no longer mention `deploy.sh` rollback.
4. **Evaluator view, challenge submissions:** `dashboard/evaluations/[innovationId]/page.tsx` hides
   the Innovation details and Support requested cards when `innovation.challengeId` is set (the
   page's existing `isChallengeSubmission` flag). General submissions and the admin evaluation page
   are unchanged. Web `tsc` is clean; browser-checked in item 5.
5. **Full-cycle test (local, API + browser):** admin creates a published challenge (custom label
   "Send my idea") with an 8-field form (4 mapped text fields, number, select, `.png` file,
   consent) → innovator uploads a file and submits (an incomplete submission gets 400 with 6 field
   errors) → preliminary longlists → authenticity midlists → evaluator sees it via category
   auto-match and shortlists (→ SELECTED) → admin `approval finalize` (→ APPROVED) → publish. The
   public API hides `challengeResponses`; the idea shows in repository search; the activity log has
   all 6 events. 19/19 checks passed. In the browser, the evaluator page showed no Innovation
   details / Support requested cards for the challenge submission. Gotchas: form `acceptedFileTypes`
   takes extensions (`.png`), and the status DTO is `{reviewStatus, note}`. The homepage popup still
   opens over `/challenges/[slug]` (known issue). Test data left in the local DB: 3 `e2e-cycle-*`
   challenges, published NIR-2026-000085, and NIR-2026-000084 stuck at UNDER_REVIEW.
6. **"Innovation team" → "Team"** card heading in: evaluator page, admin evaluation page,
   `innovation-detail.tsx` (the `/repository/[slug]` page that Preliminary/Authenticity reviewers
   open from their queues, also the public page) and the submitter's own innovation page. It
   applies to every submission, not just challenge ones. English-only hardcoded strings (no i18n
   key). Follow-up: the `/submit` sentence now says "the team" too, so no "innovation team" text is
   left in the web app. No challenge form field (local DB or dev.challenge.gov.bd, checked via the
   public form API) uses the label. Browser-checked: evaluator page, `/repository/[slug]` (the
   reviewers' view), admin evaluation page, the innovator's own page and `/submit` all show "Team".
7. **Full end-to-end workflow test (local).** Ran the API with `MAIL_TRANSPORT=console
   SMS_PROVIDER=console` (process env overrides `.env`; restored afterwards) so no real email/SMS
   went out.
   - Admin created `e2e-wf-mwj1h089` (Agriculture, custom label "Submit your idea", 8-field form:
     4 mapped text fields, select, radio, number, consent).
   - A new applicant registered in the browser with an email OTP read from the API log, then
     filled and submitted the form in the browser → NIR-2026-000086.
   - API checks at each stage: answers and mapped fields identical for the applicant, preliminary,
     authenticity, evaluator and admin; review notes passed forward; the evaluator's scores and
     comment reached admin; not public before publishing; public and other innovators see no
     challenge answers or scores; the applicant sees PUBLISHED; found in search; full audit trail.
     Browser checks: applicant's "My innovations" shows PUBLISHED, the signed-out public page and
     repository search show it.
   - **Bug found and fixed:** `POST /evaluations` had no stage check. An evaluator's early score
     (during authenticity review) was saved, moved nothing, and then blocked their real evaluation
     with 409. Now 400 before `SHORTLISTED`, 404 for an unknown id. A regression test was added to
     `review-workflow.e2e.test.js` (7/7). The stray early evaluation row was deleted.
   - **Also fixed:** the challenge page's "You'll need to sign in (or register) to submit" note now
     shows only when signed out. The challenge form's final button uses the custom submit label
     when set (was always "Submit to <title>"); checked in EN and BN.
   - **Found, not fixed** (ROADMAP known issues): evaluators aren't restricted to
     assigned/category innovations by the API; radio/select answers can't map to stage/type.
   - Tests: unit 40/40, e2e 27 pass / 3 skipped. Test data left in the local DB: challenge
     `e2e-wf-mwj1h089`, published NIR-2026-000086, applicant `e2e-wf-mwj1h089@example.com`.

**Next steps:** pushing to GitLab `development` no longer deploys anything. Someone with server
access deploys by hand (SETUP.md), and the CI/CD variables in GitLab (SSH key, host, etc.) can be
deleted. If the GitLab runner was only for this project, it can be retired too.

---

## 2026-11-16 (session 47) — six-item batch: fixed sign-up role, submit-button label, SSO hidden, NIR full name, live countdown, 200 options

1. **Registration fixed to Innovation Submitter:** the register page shows the role dropdown
   disabled with only Innovation Submitter, plus a hint (`auth.roleFixedHint`).
   `AuthService.register` rejects any `role` with 400 before touching the OTP. Both sides sit
   behind `SELF_SERVICE_ROLES_AT_SIGNUP = false` (API `auth.service.ts`, web `register/page.tsx`).
   This also mitigates the 2026-11-15 open question about Ministry Focal Point self-sign-up (see
   ROADMAP).
2. **Configurable challenge submit-button label:** migration
   `20261116042925_challenge_submit_button_label` (`Challenge.submitButtonLabelEn/Bn`), DTO fields
   (max 40 chars), blank stored as NULL. Admin challenge form: English input under Apply URL,
   Bangla under বাংলা translations. Used by every challenge-submit CTA (popup, homepage banner,
   challenges list + its aria-label, both details-page buttons) via `tx.submitLabel`; the default
   labels are unchanged when blank.
3. **SSO buttons hidden** on sign-in and register (`SSO_BUTTONS_VISIBLE = false` in
   `sso-buttons.tsx`).
4. **Full form of NIR on sign-in / register:** first done as an extra "NIR – National Innovation
   Repository" line under the logo; on feedback, replaced by putting the full name in the titles
   instead ("Sign in to National Innovation Repository", "Create your National Innovation
   Repository account"; Bangla "জাতীয় উদ্ভাবন রিপোজিটরি-তে সাইন ইন করুন" / "আপনার জাতীয় উদ্ভাবন
   রিপোজিটরি অ্যাকাউন্ট তৈরি করুন"). `AuthCard` is unchanged; `auth.nirFullName` removed.
5. **Popup countdown** is now `Days : Hours : Minutes : Seconds`, ticking every second
   (`challengeTimeLeftMs` + `splitDuration` in `lib/challenge-dates.ts`, same
   end-of-deadline-day-UTC cutoff as before). The popup's `daysLeft` message was replaced by
   `home.challengePopup.countdown.*`. Follow-up: the countdown now sits beside the "Challenge open
   now" pill (one flex-wrap row, countdown made more compact); it wraps below only on phones.
   Checked in en + bn at desktop width.
6. **Form builder options limit 100 → 200** (`MAX_OPTIONS` in `challenge-rules.ts`, used by the DTO
   for `options` and `optionsBn`). The builder shows "N / 200 options" and caps the textarea at 14
   rows.
- **Tests:** API unit 40/40; e2e 25 pass / 0 fail / 3 skipped (a later rerun hit the login
  throttle, 429, not a code failure); web `tsc --noEmit` clean. API checks: register with
  `role: INVESTOR` → 400; label create/trim/clear round-trip; 200 options → 200, 201 → 400.
  Browser: register (locked role, no SSO, full name), `/bn/sign-in`, homepage popup countdown
  (14 d 19 h 25 m, correct for a 30 Nov deadline), custom label on `test123` in the en list and
  bn details page (temporary label removed afterwards; throwaway challenge deleted). The admin
  form-builder counter and label inputs were type-checked only, not viewed in the browser.
- **Files:** API `schema.prisma` + migration, `auth.service.ts`, `challenge-rules.ts`,
  `challenges.service.ts`, `dto/challenge.dto.ts`. Web `register/page.tsx`, `auth-card.tsx`,
  `sso-buttons.tsx`, `challenge-popup.tsx`, `challenge-banner.tsx`, challenges list + details
  pages, `dashboard/admin/page.tsx`, `challenge-form-builder.tsx`, `lib/challenge-dates.ts`,
  `lib/challenge-i18n.ts`, `hooks/use-content.ts`, `messages/en.json` + `bn.json`. Docs: API,
  DATABASE, PROJECT_CONTEXT, ROLES, UI_GUIDELINES, ROADMAP, this log.
- **Deploy note:** new migration → `prisma migrate deploy` on the servers.
- **Upload-size test on dev.challenge.gov.bd (same session):** signed in as admin (Turnstile
  passed on its own). Cutoff is exactly 1 MiB of request body via host nginx (1,048,300-byte file
  → 201 and served back; 1,048,400 B, 2, 5 and 10 MB → 413 HTML), same with or without login.
  The app's own 50 MB limit is never reached. Live UI: the `uich` form (accepting, "Max 5 MB" /
  "Max 50 MB") shows only "Upload failed" for 2 MB files; the admin banner field shows "Upload
  failed — try a smaller image or paste a URL instead." Also found the challenge popup covering
  the submit page. Both in ROADMAP Known issues. Three test PNGs (100 KB, 900 KB, 1 MB) were left
  in the dev server's `/uploads` (no delete endpoint). Dev is not yet running this session's code.
- **Next:** not committed or pushed. Per the standing rule, push goes to GitLab `development`.

## 2026-11-15 (session 46) — Publish button missing on Admin Evaluations

- **Reported:** in the admin Evaluations tab, an evaluated innovation has no Publish button.
- **Findings:** (1) by design, publishing only existed on Repository Management and the
  Moderation page, never on the Evaluations pages. (2) A real blocker: the detail page's approval
  section hid its only action button when the innovation requested no Recognition/Mentor/Fund
  support, so such an innovation sat at `SELECTED` with no way to approve (and therefore publish)
  it from here. No backend change needed: `APPROVED → PUBLISHED` via `PATCH /innovations/:id/status`
  is already admin-guarded and sets `publishedAt`.
- **Changes (web only):**
  - New `components/admin/publish-innovation-button.tsx`: Publish/Republish for
    `APPROVED`/`UNPUBLISHED`, with `ConfirmDialog` and inline error.
  - `dashboard/admin/evaluations/page.tsx`: Reviewed rows show a status pill + Publish button;
    `UNPUBLISHED` now counts as Reviewed.
  - `dashboard/admin/evaluations/[innovationId]/page.tsx`: new Publication panel (Publish / "View
    public page" / link to Repository Management); the approve button always shows while
    `SELECTED` ("Approve innovation" when nothing was requested). Fixed stale comments that said
    approval moves to `PUBLISHED`.
  - `hooks/use-innovations.ts`: status changes also invalidate `shortlisted-evaluations`.
- **Tests:** web `tsc --noEmit` clean. In the browser as `admin@nir.gov.bd`, with two throwaway
  `SELECTED` innovations (one with no requests, one with mentorship): approved both, published one
  from the list and one from the detail panel; DB showed `PUBLISHED` + `publishedAt`, the public
  API served them (200), and the lists refreshed without reload. Test rows deleted afterwards.
- **Note:** the dev DB has 6 innovations at `SHORTLISTED` with a `SHORTLIST` evaluation (seeded
  that way). They appear in neither tab. Pre-existing seed artefact, not touched.
- **Files:** the four web files above; `docs/PROJECT_CONTEXT.md`, `UI_GUIDELINES.md`,
  `ROADMAP.md`, `SESSION_LOG.md`.
- **Demo data (local dev DB only, kept on purpose for the user to try publishing):**
  `NIR-2026-000079`–`000082` at `APPROVED` (Solar Hydroponic Fodder Unit; Ma-Shishu Alert; Coastal
  Solar Desalination Kiosk; Pathshala Radio) and `NIR-2026-000083` at `SELECTED` (Digital Land
  Mutation Tracker). Each has a `SHORTLIST` evaluation and preliminary/authenticity review notes.
  They were inserted directly via Prisma, not through the API, so they have no audit-log history
  for the earlier stages.
- **Sparkling Challenges nav item:** the top-menu "Challenges" link now shows a twinkling sparkle
  and a pulsing green dot (mobile: plus an "Open now" pill) while any challenge is accepting
  submissions. Files: `components/layout/site-header.tsx`, `tailwind.config.ts` (`twinkle`
  animation), `messages/en.json` + `bn.json` (`nav.challengesLive`). Web `tsc` clean. Verified in
  the browser by temporarily setting `UiChallenge` to `OPEN`, then restored it to `CLOSED`. No
  challenge in the local DB is accepting submissions at the moment, so the sparkle is currently
  off. See [UI_GUIDELINES.md](UI_GUIDELINES.md#reusable-patterns).
- **dev.challenge.gov.bd uploads failing (diagnosed, server fix needed):** host nginx is on the
  default `client_max_body_size 1m`, so uploads over 1 MB get 413 from nginx (probed without
  auth: 900 KB → 401 from the API, 1.1 MB / 3 MB → 413 from nginx). Fix documented in
  [SETUP.md](SETUP.md#docker-path-not-used-on-this-machine-but-supported). Two app-side
  weaknesses found on the way (not fixed yet, see ROADMAP): `lib/upload.ts` doesn't refresh an
  expired access token (15 min TTL), and it shows a generic "Upload failed" for a 413 HTML reply.
- **Challenge submission images as attachments + lightbox:** images on reviewer screens were a
  large inline hero (first `PHOTO` attachment, since challenge file answers become
  `InnovationAttachment` rows). Now every file shows as a compact row (icon, name, type, size);
  images open in a lightbox on click. New `components/ui/attachment-list.tsx`; changed
  `challenge-form/challenge-responses.tsx` (+ `challengeExtraAttachments`),
  `repository/innovation-detail.tsx`, `dashboard/evaluations/[innovationId]/page.tsx`,
  `dashboard/admin/evaluations/[innovationId]/page.tsx`. See UI_GUIDELINES "Reusable patterns".
  Tested in the browser on a throwaway challenge submission (3 images + 1 PDF): no inline images,
  no duplicates, lightbox prev/next/Esc work, PDF opens as a link. Test row deleted.
- **Optional-auth guard fix (found while testing):** `OptionalJwtAuthGuard` treated an
  expired/invalid bearer token as anonymous, so after 15 min a reviewer could get 404 "Innovation
  not found" on unpublished submissions, with no token refresh. It now returns 401 for a bad token
  (no token is still anonymous). `lib/api-client.ts` retries once without a token if the refresh
  fails. Verified with curl: no token → 404 (unpublished), bad token → 401, `GET /challenges` →
  200. API rebuilt and restarted. See API.md.
- **Note:** the local "Open now" sparkle is on because a new challenge `test123` (not created in
  this session) is accepting submissions.
- **Next:** not committed or pushed yet. Per the standing rule, push goes to GitLab `development`.

### Session 46, part 2 (2026-11-15) — five-item batch

1. **Challenge images as attachments + lightbox:** already done earlier this session (re-requested);
   confirmed still in place.
2. **Show/hide password:** new `components/auth/password-input.tsx` (eye / eye-off, translated
   labels, `type="button"`), used on sign-in and register. Validation attributes unchanged.
   Verified in the browser on both pages (en + bn).
3. **Readable file names:** `FileName`/`cleanFileName` in `components/ui/attachment-list.tsx`
   (extension always visible, base truncates with "…", tooltip with the full name, UUID names →
   `Attachment.<ext>`); challenge captions split into name + question. Applied to the challenge
   form's file list, the submitter's Attachments panel (`AttachmentList` + `renderAction` for
   Remove), `ChallengeResponses` (grid `minmax(0,1fr)` fix) and reviewer lists. API:
   `readableOriginalName` re-decodes multer's latin1 file names as UTF-8 (Bangla names were
   garbled). New `test/upload-name.test.js`. Browser check: long / UUID / Bangla names, no overflow.
4. **Bilingual challenges:** migration `20261115092802_challenge_bangla_fields` (organizer, prize,
   form field label/description/placeholder/help/options in Bangla); JSON list `…Bn` keys
   (fixed `toData`, which would have dropped them); `closedCode` on submission state.
   Web: `lib/challenge-i18n.ts`, new `challenges.*` messages (en + bn, 267 keys each, parity
   checked); list, details, submit page, dynamic form + validation, answers block, home banner,
   popup and sign-in/register challenge hints all localized; admin editor + form builder have
   Bangla inputs. Fixed on the way: a consent checkbox's text was discarded on save.
   API round-trip verified with a throwaway challenge (deleted).
5. **OTP verification auto-activates the account:** `AuthService.register` creates the user active
   and returns a session; the register page signs the user in and continues to `next` or
   `/dashboard`. e2e test updated. **Open product question** about Ministry Focal Point / Investor
   (see ROADMAP known issues).
- **Tests:** unit 40/40; e2e 28/28 (auth suite rerun with console delivery after the OTP rate
  limit window; no real email/SMS sent); web `tsc` clean.
- **Files:** API `auth.service.ts`, `uploads.controller.ts`, `challenge-rules.ts`,
  `challenges.service.ts`, `dto/challenge.dto.ts`, `innovations.service.ts`, `schema.prisma` +
  migration, `package.json`, tests (`auth-security.e2e`, `challenge-rules`, new `upload-name`).
  Web: `password-input.tsx` (new), `lib/challenge-i18n.ts` (new), `attachment-list.tsx`,
  `dynamic-form.tsx`, `challenge-responses.tsx`, `types.ts`, `challenge-form-builder.tsx`,
  `admin/page.tsx`, challenges list/details/submit pages, `sign-in`, `register`, `use-auth.ts`,
  `use-content.ts`, `innovations/[id]/page.tsx`, `challenge-banner.tsx`, `challenge-popup.tsx`,
  `messages/en.json` + `bn.json`. Docs: API, DATABASE, PROJECT_CONTEXT, ROLES, UI_GUIDELINES,
  ROADMAP, SETUP, this log.
- **Deploy note:** the new migration must run on the servers (`prisma migrate deploy`; the
  Docker API container does it automatically).

## 2026-11-12 (session 45) — Preliminary Reviewer couldn't longlist/forward or reject

- **Reported:** (1) a Preliminary Reviewer can't longlist submitted innovations (forward them to the
  Authenticity Reviewer); (2) a Preliminary Reviewer can't reject a submitted innovation.
- **Investigation:** with the seeded single-role `preliminary@nir.gov.bd` both actions worked
  locally, through the API and the UI. The failure is role-dependent:
  - **Root cause:** `InnovationsService.updateStatus` checked each reviewer role
    independently (`isPreliminaryReviewerOnly`, `isAuthenticityReviewerOnly`). For a user holding
    **both** reviewer roles (allowed: roles are a list and the admin page assigns several), the
    authenticity check also ran on every `UNDER_REVIEW` item and threw 403 "Authenticity
    reviewers may only shortlist or reject…". So Longlist and Reject always failed. Reproduced
    with a new e2e test against the old build (3 failures), and it passes after the fix.
  - **Aggravating:** the review pages ignored mutation errors, so any 403/400 looked like a dead
    button.
- **Fix:**
  - API: the reviewer stage is now chosen from the submission's current status (`UNDER_REVIEW` →
    preliminary rules and categories, `AUTHENTICITY_REVIEW` → authenticity rules and categories,
    anything else → 403 with a readable reason). The review comment is filed under that stage.
    Senior roles are unchanged.
  - Web (`dashboard/preliminary-review`): shows the server error under the buttons. "Longlist →
    Authenticity review" names where it goes, both buttons show progress, and Reject asks for
    confirmation. `dashboard/authenticity-review` also shows errors now.
- **Tests:** new `test/review-workflow.e2e.test.js` (5 cases: longlist, reject, guards with
  messages, dual-role longlist→shortlist, dual-role reject; self-cleaning, verified 0 leftovers),
  added to `test:e2e`. e2e 25 pass / 3 skipped (real-delivery guard) / 0 fail; unit 32/32; web
  `tsc` clean; checked in the browser as the preliminary reviewer.
- **Diagnostic side effects:** while reproducing, I rejected and restored "TeleHealth Union
  Connect" (`cmsbgi8a9001j12go8q40dkje`) twice. It's back to `UNDER_REVIEW` with no remarks and
  the test comment deleted. Its audit log keeps the 4 status-change entries (left in place on
  purpose).
- **Files:** `apps/api/src/innovations/innovations.service.ts`, `apps/api/test/review-workflow.e2e.test.js`
  (new), `apps/api/package.json`, `apps/web/src/app/[locale]/dashboard/preliminary-review/page.tsx`,
  `apps/web/src/app/[locale]/dashboard/authenticity-review/page.tsx`; docs ROLES, API, SETUP,
  SESSION_LOG.
- **Full-cycle test (Submit → Publish), passed.** I ran it with the real demo account for each
  role: innovator1 creates and submits → preliminary@ longlists → authenticity@ midlists →
  evaluator@ scores 8/7/9/7 and recommends SHORTLIST (auto → SELECTED) → admin approves with
  finalize (→ APPROVED) → admin publishes → visible to anonymous visitors and found by search.
  Each role's queue was checked to contain the item before it acted, and the authenticity reviewer
  could read the preliminary note. 20/20 checks passed; general submission was switched on for the
  test and restored to OFF. Test item **NIR-2026-000078 "[TEST] Full-cycle check 2026-11-12 10:09"
  is left PUBLISHED** in the local DB (by intent, for review); archive or delete it when done.
  - Observation (not fixed): the audit log records every step, but three transitions are logged
    under other events without from/to metadata (`INNOVATION_SUBMITTED_FOR_REVIEW`,
    `EVALUATION_SUBMITTED` for SHORTLISTED→SELECTED, `INNOVATION_APPROVAL_UPDATED` for
    SELECTED→APPROVED). An audit view filtering only `INNOVATION_STATUS_CHANGED` would miss them.
  - Button naming: the authenticity forward button is now "Midlist → Expert evaluation", matching
    "Longlist → Authenticity review".
- **Pushed the full code to GitLab `development`** (sessions 41–45), cherry-picked onto
  `gitlab/development` (unrelated histories). It includes challenge submissions, the details
  page, CI/CD (`.gitlab-ci.yml`, `deploy/deploy.sh`), OTP/CAPTCHA, Gmail/Teletalk and this
  reviewer fix. GitLab's `v0.1.2` footer bump is kept. A partial push (without the challenge
  work) was prepared first and then dropped when the user asked for the full code. **Before the
  server deploy:** the server `.env` needs `CAPTCHA_PROVIDER`, `MAIL_TRANSPORT`/`SMTP_*` and
  `SMS_PROVIDER`/`SMS_TELETALK_*`, or the API refuses to start. 3 new migrations run on deploy.
- **Code cleanup (/simplify, 4 parallel reviews over sessions 41–45).** Behaviour-preserving:
  - API: shared `common/utils/roles.ts` (`ADMIN_ROLES`, `REVIEW_PIPELINE_ROLES`, `isAdmin`,
    `hasAnyRole`) replaces 5 inline admin-role arrays; `uploads/upload-limits.ts` is the one
    source for the 50 MB limit (multer and challenge rules); `optionalEnv()` in `env-choice.ts`
    (mail/SMS); OTP send runs its cooldown and hourly-cap queries in parallel, and so does challenge
    submit for its challenge/innovator lookups; the settings toggle no longer re-reads after save.
  - Web: `components/ui/mutation-error.tsx` (both review pages); `pickPromotedChallenge()` in
    `lib/challenge-dates.ts` (banner and popup); `toQueryString` moved to `lib/api-client.ts`
    (repository admin and submissions hooks); the Submissions page uses `ReviewStatus` /
    `SubmissionChannel` from `@nir/shared` and an `EMPTY_FILTERS` constant; the register page
    derives the active OTP channel instead of correcting it in an effect, with a
    `startCooldown()` helper; multi-file challenge uploads run in parallel; the form builder's
    `savedAt` timestamp became a `justSaved` boolean.
  - **Bug found and fixed:** `main.ts` tested `TRUST_PROXY` with `/^d+$/` (missing backslash),
    so `TRUST_PROXY=1` reached Express as the string "1", which it treats as an IP address. The
    effect was that no proxy was trusted, so per-IP limits behind a proxy would have been
    site-wide. Now `/^d+$/`. This bug is in the code already pushed to GitLab, but
    `TRUST_PROXY` isn't set on any server yet.
  - Skipped on purpose:
    - Status colour maps: merging needs a colour decision (two shades differ).
    - Shared `useCaptcha` hook: restructures both auth pages.
    - Async `statSync` in challenge validation: makes the pure validator async.
    - Prisma enums in `challenge-rules.ts`: the module is deliberately Prisma-free for unit tests.
    - Innovation slug helper: the two recipes differ on purpose.
    - Parallel register lookups: would change which error wins.
    - Header/hero → `GeneralSubmitGate`: client components use the hook directly; the gate is for
      the server-rendered footer.
    - Confirm-on-reject on the authenticity page: behaviour change.
  - Verified: API build, web `tsc`, unit 32/32, e2e 25 pass / 3 skipped / 0 fail, changed
    pages return 200.
- **Next steps:** if the reporter's account has only `PRELIMINARY_REVIEWER`, the page now shows
  the exact server reason (most likely "outside your assigned review categories", fixed by
  assigning categories in Platform admin). Not committed or pushed.

---

## 2026-11-12 (session 44) — Registration OTP (email/SMS) + CAPTCHA on every login

- **Ran the project** (SETUP.md path: PG on 5433 already current, shared + API built with `tsc`,
  `node dist/main.js`, web `npm run dev`). Both healthy.
- **Task (updated requirements):** (1) OTP verification at registration by phone or email;
  (2) CAPTCHA on every login attempt; (3) identify all prerequisites, configuration, third-party
  services and integrations.
- **Decisions** (made by me, open to revision):
  - *Verify before create.* Two-step registration: `POST /auth/otp/send`, then
    `POST /auth/register` with `otpChannel` + `otpCode`. No unverified accounts are ever created.
    The existing admin-approval gate still applies afterwards.
  - *Pluggable providers, no vendor lock-in.* CAPTCHA: Turnstile / reCAPTCHA v2 / hCaptcha (one
    server check, one widget component). Email: SMTP via `nodemailer`. SMS: a template-driven
    generic HTTP client, because BD aggregators (SSL Wireless, BulkSMSBD, …) all differ; it also
    covers Twilio. Recommended Turnstile, since the dev site is already behind Cloudflare.
  - *CAPTCHA also on OTP send*, beyond the requirement: every send costs an SMS (SMS-pumping
    abuse), and the 409 "already registered" response would otherwise allow account enumeration.
  - *Fail closed, fail loud.* Production (`NODE_ENV=production`) refuses to boot unless
    `CAPTCHA_PROVIDER`/`MAIL_TRANSPORT`/`SMS_PROVIDER` are set explicitly. CAPTCHA provider
    outage → 503 (not a bypass).
  - CAPTCHA site key served by `GET /auth/security-config`, not a `NEXT_PUBLIC_*` var, so key
    changes need no web rebuild.
  - Phones are now stored normalized (`+8801XXXXXXXXX`); uniqueness checks try legacy spellings.
  - Added opt-in `TRUST_PROXY` (main.ts) — per-IP throttles were already effectively global behind
    a proxy; the new tighter auth throttles made that matter.
- **Bug fixed — `/register` (and `/sign-in`, `/dashboard/*`) couldn't scroll.** In
  `components/layout/challenge-popup.tsx` the body scroll lock followed `open`, not `show`. On the
  routes where the popup is deliberately hidden, an *invisible* popup still set
  `body { overflow: hidden }` whenever a challenge was OPEN and not yet dismissed this session.
  Now the lock and the Escape handler follow `show`. It surfaced because the OTP/CAPTCHA
  additions made the register form taller than the viewport.
- **Browser-verified (Claude in Chrome, Turnstile test keys, console mail/SMS):** `/register`
  scrolls with an undismissed popup; registration via email OTP and via SMS OTP both complete
  (DB: `emailVerifiedAt` / `phoneVerifiedAt` set, phone stored `+8801799000112`, account inactive
  pending approval); `/sign-in` CAPTCHA renders, the login reaches the API (pending-approval
  error) and the widget resets afterwards. The test accounts and OTP rows were deleted.
- **Real SMS via Teletalk Bulk SMS:** new `SMS_PROVIDER=teletalk` in `SmsService`. Teletalk needs
  per-message md5 password, random 16-digit `p_key` and `a_key = md5((p_key+user_id)."****")`,
  which the generic template client can't express. Success = JSON `status: SUCCESS`. Credentials
  (user `challenge`, id 102) are in the gitignored `apps/api/.env`; the new vars are in both
  `.env.example` files and `docker-compose.yml`.
  - Found by testing the live gateway: the OTP class is limited to **70 UTF-8 bytes** (scode 51),
    so a 59-character Bangla text was rejected. Shortened both SMS texts in `otp.service.ts`
    (Bangla 66 bytes, English 60). The code is now in ASCII digits in Bangla too, because the
    input only accepts 0-9.
  - Verified: a real Bangla OTP was delivered to 01710774482 through `POST /auth/otp/send` (plus
    3 probe SMS while measuring the limit; about 4 credits used). Unit tests 32/32 (4 new Teletalk
    cases with a fake server).
  - e2e: tests that really deliver now **skip** when mail/SMS aren't `console` (they would
    email `@example.com` and text random `019…` numbers). Run: 20 pass, 3 skipped. Override
    with `NIR_E2E_REAL_DELIVERY=1`.
  - Fixed docs/SETUP.md: the env table had been split by the SMTP note.
- **Real SMTP configured locally:** Google Workspace `smtp.gmail.com:587` (STARTTLS) as
  `support-challenge@a2i.gov.bd`, Reply-To `noreply-challenge@a2i.gov.bd`, in the gitignored
  `apps/api/.env` (`MAIL_TRANSPORT=smtp`). `MailService` gained `MAIL_REPLY_TO` and
  `SMTP_REQUIRE_TLS` (default true, so it won't fall back to plaintext on 587), and both were added
  to `.env.example`, `docker-compose.yml` and SETUP.md. Connection + auth verified with
  `transporter.verify()` (no mail sent); API rebuilt and restarted. The server `.env` still needs
  the same values before deploy.
- **Bug fixed — register verify step opened scrolled off-screen.** The step switch kept the tall
  details form's scroll offset, so the code input sat above the viewport. `register/page.tsx` now
  scrolls to the top whenever `step` changes.
- **DB:** migration `20261112044745_registration_otp` (`OtpCode`, enums `OtpChannel`/`OtpPurpose`,
  `User.phoneVerifiedAt`).
- **Verified:** API build clean; `npm test` 28/28 (new `sms-gateway.test.js`: URL/JSON/form escaping,
  success pattern, misconfig, BD phone normalization); `npm run test:e2e` 23/23 (new
  `auth-security.e2e.test.js`, 13 cases: CAPTCHA required/accepted on login and OTP send, 409 on
  taken email/phone, resend cooldown 429, wrong code → attempts left, 5-attempt lockout, code bound
  to its address and single-use, email/phone verified flags, phone normalization; existing
  challenge suite still passes with CAPTCHA). The production boot guard was checked by hand.
  Console OTP delivery checked in the API log (EN + BN). Web `tsc --noEmit` clean;
  `/sign-in`, `/register` (en + bn) compile and return 200. **Not looked at in a browser:** the
  Chrome extension wasn't connected, so the widget rendering and the two-step UX are unverified
  visually.
- **Files:** API — `prisma/schema.prisma`, new migration, `package.json` (nodemailer, test
  scripts), `.env.example` (new), `src/main.ts`, `src/app.module.ts`, `src/messaging/*` (new),
  `src/common/utils/{phone,env-choice}.ts` (new), `src/auth/{captcha,otp}.service.ts` (new),
  `src/auth/{auth.service,auth.controller,auth.module}.ts`, `src/auth/dto/{send-otp (new),register,login}.dto.ts`,
  `test/{auth-security.e2e,sms-gateway}.test.js` (new), `test/challenge-submissions.e2e.test.js`.
  Web — `src/components/auth/captcha-widget.tsx` (new), `src/hooks/use-auth.ts`,
  `src/app/[locale]/{sign-in,register}/page.tsx`, `messages/{en,bn}.json`. Root —
  `docker-compose.yml`, `.env.example`. Docs — SETUP (new prerequisites/config section), API,
  DATABASE, PROJECT_CONTEXT, ROADMAP, UI_GUIDELINES. Local-only: `apps/api/.env` (Turnstile test
  keys, console transports).
- **Next steps:**
  1. **Before pushing to GitLab `development`:** add the new vars to the server's `.env`
     (at least `CAPTCHA_PROVIDER`, `CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY`, `MAIL_TRANSPORT`,
     `SMS_PROVIDER`, and probably `TRUST_PROXY`). Otherwise the API container won't boot and the
     deploy rolls back. Same for Railway if `origin` is ever pushed.
  2. Procure the CAPTCHA keys, SMTP account (+ SPF/DKIM/DMARC) and an SMS gateway (sender ID,
     balance, IP whitelist) — see SETUP.md.
  3. Visual pass in a browser (desktop + 375px; Bangla).
  4. ROADMAP tech-debt items: purge old `OtpCode` rows; route notifications through the real
     transports.

---

## 2026-11-11 (session 43) — Richer challenge details page

- **Ran the project** (same SETUP.md path). Answered: no cache server exists (no Redis etc.);
  popup banner is 16:7 (recommend ~1600×700, keep the subject centred — the same image is cropped
  to 16:9 / 4:3 / 8:5 elsewhere).
- **Task — "show more details when I click the popup's details".** Decision (agreed with user):
  keep the popup a short teaser, put the content on `/challenges/[slug]`, using structured
  optional fields rather than one rich-text blob.
  - *DB:* migration `20261111104946_challenge_detail_sections` — Bn/En text pairs (problem,
    eligibility, evaluation criteria, prize details, additional info), contact name/email/phone,
    JSON lists `timelinePhases`/`faqs`/`resources`.
  - *API:* `ChallengeDetailsDto` base for create/update (nested validation; resource URLs must be
    http(s) or `/uploads/` — blocks `javascript:` links; email validated); service trims and
    stores blanks as `NULL`.
  - *Web:* redesigned details page (section nav, timeline, FAQ accordion, resources, sticky
    sidebar with Submit/closed reason + contact, mobile apply bar, EN/BN via new `challengeDetail`
    namespace); popup gets a days-left badge and a 3-line description clamp
    (`lib/challenge-dates.ts`); admin Challenges form gets a collapsible "Details page content"
    editor with list rows, resource upload and Bangla translations.
- **Verified:** API build clean; scripted API check against the live server (create/patch, blank →
  null, list trimming, 400 on `javascript:` URL and bad email, delete) passed. Web `tsc --noEmit`
  clean; `/en|bn/challenges/<slug>`, `/dashboard/admin`, `/` return 200 and compile cleanly.
  **Not looked at in a browser** (Chrome extension not connected).
- **Test data left on purpose:** a published OPEN challenge `zz-details-preview` ("Clean Water
  Innovation Challenge (TEST)") with every section filled, so the page can be reviewed at
  `http://localhost:3000/challenges/zz-details-preview`. Delete it from Platform admin →
  Challenges when done (it has no submissions).
- **Files:** `apps/api/prisma/schema.prisma`, new migration,
  `apps/api/src/challenges/dto/challenge.dto.ts`, `apps/api/src/challenges/challenges.service.ts`,
  `apps/web/messages/{en,bn}.json`, `apps/web/src/hooks/use-content.ts`,
  `apps/web/src/lib/challenge-dates.ts` (new), `apps/web/src/components/layout/challenge-popup.tsx`,
  `apps/web/src/app/[locale]/challenges/[slug]/page.tsx`,
  `apps/web/src/app/[locale]/dashboard/admin/page.tsx`; docs: DATABASE, API, UI_GUIDELINES,
  PROJECT_CONTEXT, ROADMAP (also corrected stale model/enum/migration counts: 50/27/22).
- **Next steps:** visual pass in a browser (desktop + 375px; check the sticky sidebar offset under
  the header and the mobile bottom bar); delete the test challenge; commit + push to GitLab
  `development` together with session 42's still-uncommitted work; servers need
  `prisma migrate deploy`.

---

## 2026-11-10 (session 42) — Admin-controlled general submission + challenge-based submission

- **Ran the project** (API via `tsc` + `node dist/main.js`, web via `npm run dev`, PG on 5433 —
  per SETUP.md) — both healthy.
- **Implemented two independent submission channels** (full rules in PROJECT_CONTEXT.md §
  Business Rules):
  - *General submission switch* — `PlatformSetting` + `SettingsModule`
    (`GET/PATCH /settings/submission`); enforced in `InnovationsService.create`/`submit`;
    all public `/submit` links gated (header, hero, footer, `/challenges` callout), `/submit`
    shows a closed notice.
  - *Challenge-based submission* — new `ChallengesModule` (challenge CRUD moved out of `cms/`),
    `Challenge.isPublished/isActive/submissionsEnabled`, `ChallengeFormField` (dynamic form),
    `Innovation.submissionChannel/challengeId/challengeResponses`. Submissions become
    `UNDER_REVIEW` innovations → existing Primary → Authenticity → Expert → Admin workflow,
    untouched. Pure rules (validation, submission window) in `challenge-rules.ts`.
  - *Auth* — `/challenges/:slug/submit` redirects anonymous users to `/sign-in?next=…`; sign-in
    and register preserve `next` (validated by `lib/safe-next.ts`); API 401s anonymous.
  - *Admin UI* — Platform admin → Challenges: category, publish/active/submissions switches,
    submission counts, form builder (`components/admin/challenge-form-builder.tsx`); new
    `/dashboard/admin/submissions` page (general switch + monitoring with channel/challenge/
    status/user/date filters) + sidebar entry.
  - *Review views* — `ChallengeResponses` panel on the repository detail (used by reviewer
    queues), submitter manage page, expert and admin evaluation pages; challenge badge on "My
    innovations". `challengeResponses` is stripped for public viewers.
- **Migration** `20261110080636_challenge_submissions_and_form_builder` (additive) — applied to
  the local DB.
- **Tests:** replaced the dead `jest` script with Node's test runner. `npm test` — 20/20 unit
  tests pass; `npm run test:e2e` — 12/12 pass against the live API (cleanup verified: no leftover
  rows). Web: `tsc --noEmit` clean; all new/changed routes return 200 on the dev server.
  **Not click-tested in a browser** (Chrome extension not connected).
- **Files:** API — `prisma/schema.prisma`, new migration, `src/challenges/*` (new),
  `src/settings/*` (new), `src/app.module.ts`, `src/cms/public-content.{controller,service}.ts`,
  `src/cms/dto/public-content.dto.ts`, `src/innovations/innovations.{module,service,controller}.ts`,
  `test/*.test.js` (new), `package.json`. Shared — `packages/shared/src/enums.ts`. Web —
  `hooks/use-settings.ts` (new), `hooks/use-content.ts`, `hooks/use-admin.ts`,
  `lib/api-client.ts` (`api.put`), `lib/safe-next.ts` (new), `components/challenge-form/*` (new),
  `components/admin/challenge-form-builder.tsx` (new), `components/layout/general-submit-gate.tsx`
  (new), `site-header`, `site-footer`, `challenge-popup`, `home/hero`, `home/challenge-banner`,
  `dashboard-shell`, `repository/innovation-detail`, pages `challenges`, `challenges/[slug]`,
  `challenges/[slug]/submit` (new), `submit`, `sign-in`, `register`, `dashboard/admin`,
  `dashboard/admin/submissions` (new), `dashboard/innovations`, `dashboard/innovations/[id]`,
  `dashboard/evaluations/[innovationId]`, `dashboard/admin/evaluations/[innovationId]`. All
  `docs/` files updated.
- **Decisions:** challenge submissions are plain `Innovation` rows (keeps the review pipeline
  unchanged); answers stored as immutable JSON snapshots; general switch defaults ON; new
  challenges created unpublished from the admin UI; challenge category required to enable
  submissions (it routes reviewers); admins bypass the general switch; REJECTED general
  resubmission still allowed when closed. See PROJECT_CONTEXT.md § Important Decisions.
- **Next steps:** manual browser pass of the new UI (see ROADMAP Known issues); commit and push
  to GitLab `development` (not done this session — not requested); servers must run
  `prisma migrate deploy`. Consider a Bangla (`bn`) pass on the new strings — they're English-only
  like the rest of the admin UI and the existing challenge pages.

---

## 2026-11-05 (session 41) — GitLab sync + images broken on dev.challenge.gov.bd

- **Synced GitLab `development` into local `master`** (`e912d98`): sdas's Docker fixes
  (Prisma build order, workspace node_modules), multi-environment `docker-compose.yml`
  (`NIR_BIND_IP`, `*_HOST_PORT`, `*_DATA_SOURCE`, `CORS_ORIGIN`; Postgres port no longer
  published) and the footer "Version: v0.1.1". Histories are unrelated, so applied as a file sync,
  not a merge. Local is still ahead by the session-38 SETUP.md note.
- **Bug: no uploaded images on https://dev.challenge.gov.bd.** The web image was built with
  `NEXT_PUBLIC_API_URL=https://dev.challenge.gov.bd`; the `/uploads/*` rewrite in
  `next.config.mjs` therefore proxied server-side back out through Cloudflare, which answers 403
  "Error 1000: DNS points to prohibited IP" (and `/_next/image` → 400 "isn't a valid image").
  API calls themselves were fine (`/api/v1/repository/search` 200).
- **Fix:** new build-time `API_INTERNAL_URL` (compose default `http://api:4000`) used by the
  rewrite, falling back to `NEXT_PUBLIC_API_URL` → Vercel/Railway and local dev unchanged.
- **Files:** `apps/web/next.config.mjs`, `apps/web/Dockerfile`, `docker-compose.yml`,
  `.env.example`, `docs/SETUP.md`.
- **Next steps:** push to GitLab `development`, then on the server `docker compose up -d --build
  web` and re-check an image URL returns 200. If images still 404 afterwards, the files aren't
  in the server's uploads volume (`apps/api/uploads/` is git-ignored) and need copying over.
  *(Fix pushed to GitLab `development` as `cd438aa`; server rebuild still pending.)*
- **Added CI/CD:** `.gitlab-ci.yml` (verify → deploy over SSH → smoke, manual rollback) +
  `deploy/deploy.sh` (backup, health-checked compose deploy, auto-rollback) + `.gitattributes`
  (`*.sh` LF). Decision: build on the server with the existing compose file rather than via a
  container registry — no registry/runner details known yet, and it matches how the server is
  already deployed. Lockfile verified in sync for `npm ci`. Not yet run in GitLab: needs a runner
  and the CI variables listed in SETUP.md § CI/CD.

---

## 2026-11-04 (session 40) — Admin "Submit & publish" for innovations

**Task — "Create an option for the Platform Administrator to submit and publish an innovation."**

- **Blocker found first:** `InnovationsService.create` required an `Innovator` profile, and
  `admin@nir.gov.bd` has none — admins couldn't create innovations at all. Now admins
  (`PLATFORM_ADMIN`/`SYSTEM_ADMIN`) skip that check; no "Lead Innovator" team row is auto-created
  for them. Deliberately did **not** auto-create an Innovator profile/IRN for admins, since that
  would count them in the public "innovators" stat.
- **New `POST /innovations/:id/publish`** (`publishDirect`): admin's own `DRAFT` → `PUBLISHED`
  directly, audit action `INNOVATION_ADMIN_PUBLISHED`. Own-drafts-only so it can't bypass review
  for innovators' work. `ALLOWED_TRANSITIONS` left unchanged.
- **Frontend:** "Add innovation" button on Repository Management → `/submit`; "My innovations"
  sidebar item now visible to admins; manage page shows a "Ready to publish?" panel with
  **Submit & publish** (ConfirmDialog) for admins instead of "Submit for review", redirecting to
  Repository Management; `/submit` helper text adjusted for admins. New hook
  `usePublishInnovationDirect`.
- **Decision:** guarded to both `PLATFORM_ADMIN` and `SYSTEM_ADMIN`, matching every other admin
  innovation guard (repository/approval/featured).
- **Verified** against the running API: admin create (201, team 0) → add team → publish (201,
  `PUBLISHED`, `publishedAt` set) → public view 200, appears in `/repository/search`, activity log
  shows `INNOVATION_ADMIN_PUBLISHED`; innovator calling publish → 403; admin publishing an
  innovator's draft → 403; re-publish → 400. Web `tsc --noEmit` clean; changed pages return 200.
  The two test innovations (+ their audit rows) were deleted from the local DB afterwards.
- **Files:** `apps/api/src/innovations/innovations.{service,controller}.ts`,
  `apps/web/src/hooks/use-innovations.ts`, `apps/web/src/components/dashboard/dashboard-shell.tsx`,
  `apps/web/src/app/[locale]/submit/page.tsx`,
  `apps/web/src/app/[locale]/dashboard/innovations/[id]/page.tsx`,
  `apps/web/src/app/[locale]/dashboard/admin/repository/page.tsx`,
  `apps/web/src/components/repository/innovation-detail.tsx`, `apps/api/prisma/schema.prisma`,
  `apps/api/prisma/migrations/20261104084951_add_created_by_admin_flag/`; docs: API, DATABASE,
  ROLES, PROJECT_CONTEXT, ROADMAP, UI_GUIDELINES, this log.

- **Follow-up (same session, user feedback): public "Submitted by" must show the admin.** Before,
  the card derived the submitter from `team`, so an admin-created innovation showed the first team
  member (or no card at all). Found that **32 existing imported innovations also have the admin as
  `submittedById`** (with real innovators in `team`), so "submitter has an admin role" would have
  relabelled all of them — user chose to scope it to the new flow only. Added
  `Innovation.createdByAdmin` (migration `20261104084951_add_created_by_admin_flag`, applied
  locally), set in `create`; `findOneForViewer` returns `submittedByAdmin` (admin's public profile
  fields, no roles) only when it's true; `components/repository/innovation-detail.tsx` prefers it
  and doesn't link it to the submitter-profile page. Verified: admin-created → "Platform
  Administrator"; NIR-2026-000045 (imported) → still "Animesh Biswas". Test data removed.

- **Pushed (same session):** to GitHub `origin/master` (`b1d7e31` code, `ea521f2` docs). Then to the
  a2i GitLab repo (`gitlab` remote, `gitlab.a2i.gov.bd/a2i-nir/a2i_nir`). Its history turned out to
  be unrelated to GitHub's, and it uses a `development → uat → master` merge-request flow, so the two
  commits were cherry-picked onto `gitlab/development` (`5db44c6`, `7ecef42`; only conflict was
  `SESSION_LOG.md`) and `development` was fast-forwarded. The temporary feature branch was then
  deleted. GitLab `uat`/`master` untouched.
- **New standing rule (user):** always push new work to the GitLab **`development`** branch. Recorded
  in [SETUP.md § Git remotes](SETUP.md#git-remotes--where-to-push-standing-rule-set-2026-11-04), with
  the cherry-pick procedure and auth notes.

**Next steps:** open a GitLab merge request `development → uat`. Whatever server deploys it must run
`prisma migrate deploy` for the new migration. The GitHub-side Railway API was not redeployed
(`railway up` not run), so on the Vercel/Railway demo the "Submit & publish" button won't work until
that's done — only relevant if that demo is still in use.

---

## 2026-11-04 (session 39) — Ran the app locally (no code changes)

Followed [SETUP.md](SETUP.md) § Standard local run exactly as session 38 did: Postgres already
listening on 5433, deleted `apps/api` `.tsbuildinfo` files, `npm run build:shared` +
`npm run build:api` (both exit 0), then started the API (`node dist/main.js`) and web
(`npm run dev`) via `Start-Process` with logs in `.logs/`. Verified
`GET /api/v1/reporting/public-stats` → 200 and web `/` → 200. No new issues found.
**Next steps:** none from this session.

---

## 2026-09-28 (session 38) — Ran the app locally (verification only, no code changes)

**Task — "Run this project."** Brought the full local stack up from a cold repo state and verified
it with real HTTP requests. Nothing under `apps/`, `packages/`, or `docs/` was changed apart from
this entry and one [SETUP.md](SETUP.md) note; `git status --short` shows only the pre-existing
untracked `Documents/NIR Test ID Password`.

- **Docker path unusable here** — `docker` is not on PATH on this machine, so the `docker compose`
  path in the README does not apply. Confirmed the two native Postgres Windows services
  (`postgresql-x64-16`, `postgresql-x64-17`) are both running and listening on 5432 and 5433; the
  project DB (`nir_dev`) is on **5433** as documented, reached via `apps/api/.env`.
- **Cold-start state matched the documented `tsc` trap:** `packages/shared/dist` existed and
  `node_modules/.prisma/client` was already generated, but `apps/api/dist` did **not** exist while
  stale `tsconfig.build.tsbuildinfo` / `tsconfig.tsbuildinfo` *did*. Deleted both `.tsbuildinfo`
  files first, then `npm run build:shared` → `npm run build:api` (exit 0, `dist/main.js` emitted),
  and ran the API with `node dist/main.js` from `apps/api` — never `npm run start:dev`.
- `npx prisma migrate status` from `apps/api`: "19 migrations found … Database schema is up to
  date!" — no migrate or seed step was needed, existing `nir_dev` data is intact and current.
- **Verified live.** API: `GET /api/v1/reporting/public-stats` → 200 with
  `totalInnovations: 37`, `totalInnovators: 16`, `totalOrganizations: 26`, `totalCategories: 20`;
  `POST /api/v1/auth/login` with `admin@nir.gov.bd` / `Password123!` → 200 with roles
  `PLATFORM_ADMIN,SYSTEM_ADMIN` and an `accessToken`; `/api/docs` → 200;
  `/api/v1/repository/search?sort=newest&page=1&pageSize=2`, `/repository/featured`, and
  `/reporting/public-breakdown` → 200 with rows. Web (Next.js 14.2.35 dev, ready in 7.6s): `/`,
  `/repository`, `/news`, `/statistics`, `/resources`, `/sign-in`, `/register`, `/submit`, `/bn`
  all → 200.
- **Smoke-test route gotchas (re-discovered, worth not re-discovering again):** the public list
  endpoint is `/api/v1/repository/search` — there is **no** bare `GET /api/v1/repository`, and its
  DTO rejects unknown params (a bare `?limit=2` is a 400, not a bug). The login page is `/sign-in`,
  not `/login` — a 404 there is expected, not a regression. Every page lives under
  `apps/web/src/app/[locale]/`, so PowerShell needs `-LiteralPath` to list that directory.
- **Correction to session 37's "background logs stay empty" note:** backgrounded stdout *is*
  capturable if the launcher does the redirect instead of the shell — `Start-Process node` with
  `-RedirectStandardOutput`/`-RedirectStandardError` for the API, and `cmd /c npm run dev > … 2> …`
  for the web, both wrote complete logs (`Nest application successfully started`,
  `✓ Ready in 7.6s`), so tailing them works as a health check alongside port/HTTP checks. Details
  added to [SETUP.md](SETUP.md).

**How it was left running:** two detached `Start-Process` background processes — API on :4000,
web dev on :3000 — logging to a new repo-root `.logs/` dir (`api.out.log`, `api.err.log`,
`web.out.log`, `web.err.log`). `.logs/*.log` is already covered by `.gitignore`'s `*.log`, so the
working tree stays clean. Stop with `Stop-Process -Id <api>,<web>` (or `Get-Process node |
Stop-Process` if nothing else Node is running); restart via SETUP.md § Standard local run. Backend
edits need `npm run build:api && node dist/main.js` again — no hot reload.

**Next steps:** none created by this session. Still open and untouched: the `nest start --watch`
build-cache fix tracked in [ROADMAP.md](ROADMAP.md).

---

## 2026-09-01 (session 37) — Ran the app locally; synced 30 local-only innovations to production

**Task 1 — ran the app.** Built `packages/shared` + `apps/api` and started the API via
`node dist/main.js` (the `nest start --watch` workaround per [SETUP.md](SETUP.md)); started
`apps/web` with `npm run dev`. Both verified against real requests — API `reporting/public-stats`
returned live data, web homepage + `/repository` rendered. No new environment gotchas. One note
for future sessions: backgrounded stdout is block-buffered on this machine, so the `.log` files
for `node dist/main.js` / `next dev` stay empty even while the servers run fine — verify with
`curl` / a port check, not by tailing the log.

**Task 2 — "upload the 37 innovations to Vercel for publish".** Clarified with the user: Vercel
only hosts the frontend; the live site reads from the Railway API + Postgres, so this meant
getting the local `PUBLISHED` innovations into the **Railway production DB**. Local had 37
published; production had 6 (the original seed subset `NIR-2025-000001/2/3/5/7/8`). User chose:
sync only the ~31 not already in prod, via the temp-`railway.json`-`startCommand` path (same as
session 18 — `railway ssh`/`tcp-proxy` still blocked here).

- **New files** (`apps/api/scripts/`): `export-prod-sync.ts` (local → DB-agnostic JSON:
  category by slug, submitter by email, region ids/SDG codes are seed-stable), `import-prod-sync.js`
  (plain CJS — ts-node isn't installed in the Railway container under `NODE_ENV=production`;
  idempotent, skips existing `innovationCode`), `prod-sync-data.json` (31 innovations),
  `prod-sync-assets/` (1 photo attachment — the only attachment across all 31).
- **Verified before deploy** against a throwaway local Postgres schema (`prodsync_test`,
  `prisma db push` + a minimal cats/regions/users/sdg seed): 31 created, 0 errors, re-run skipped
  all 31. Schema dropped after.
- **Deploy:** commit `ce552a2` wired `node apps/api/scripts/import-prod-sync.js` into
  `railway.json`'s `startCommand`; `railway up --service api --detach`. Logs showed
  `created=30 skipped=1 errors=0`. Commit `97c6692` reverted the `startCommand` and redeployed
  clean (confirmed no `[prod-sync]` line in the newest deploy's logs).
- **Result:** production went 6 → **36** published innovations
  (`totalOrganizations` 3 → 26). The frontend is fully client-fetched against the API, so no
  Vercel rebuild was needed — the new innovations and their `/repository/[slug]` pages are live
  immediately.

**Decision — `NIR-2025-000006` ("Smart Traffic Signal Optimization System") left as-is.** It's
the 1 skipped row: it already exists in the production DB but with `reviewStatus: ARCHIVED` and
`isFeatured: false` (locally it's `PUBLISHED` + featured). Someone deliberately archived it in
prod, so the importer's skip-if-exists correctly did not touch it. That's why prod is at 36, not
37. **Open question for the user:** un-archive + feature it in prod to match local? (One
`PATCH /innovations/:id/status` as admin, or a one-row update — not done without a decision.)

**Files modified:** `railway.json` (wired then reverted — net no change), `docs/SESSION_LOG.md`,
`docs/ROADMAP.md`, `docs/SETUP.md`, `docs/DATABASE.md`. **Files added:**
`apps/api/scripts/{export-prod-sync.ts,import-prod-sync.js,prod-sync-data.json,
prod-sync-assets/3617b2cd-…jpg}`.

**Next steps:**
- Decide on `NIR-2025-000006` (above).
- The `apps/api/scripts/prod-sync-*` files are one-offs kept for provenance (like the earlier
  `import-innovation-bulk.*`) — safe to delete once no re-run is expected.
- User linked a Google Drive folder of innovation imagery
  (`drive.google.com/drive/folders/1NNgrnzp8eMDBmTePwqTKl3KPvngDJ_6z`) — not consumed this
  session (only the 1 existing DB attachment was carried over). If those images should be
  attached to the imported innovations, that's a follow-up: download, map to `innovationCode`,
  upload via the admin photo endpoints or a second bundle onto the Railway volume.
- Per [SETUP.md](SETUP.md), the temp-`startCommand` seed path has now been used twice — if
  syncing prod becomes routine, set up a real one-off Railway job or get `tcp-proxy`/`ssh`
  approved for this environment.

## 2026-08-31 (session 36) — Deployed R-001, R-002, and the locale-default fix to production

Committed and pushed sessions 33–35's work (commit `3f13aef`) to `master`: the News edit fix
(R-001), the draft edit/delete fix (R-002), and the `localeDetection: false` fix for the site
defaulting to Bangla. Deliberately left `Documents/NIR Test ID Password` (untracked, name implies
credentials) out of the commit — this is a public repo.

**Vercel (`apps/web`):** auto-deployed via the GitHub integration on push, as expected — no repeat
of the intermittent silent-no-op behavior noted in
[SETUP.md](SETUP.md#vercel-appsweb). Ready in 48s.

**Railway (`apps/api`):** `railway up --service api --detach --json` from the repo root (per
[SETUP.md](SETUP.md#railway-appsapi--postgresql)), deployment `b8be4c0e-...`. `railway status`'s
"Building" indicator was unreliable for confirming completion here — it briefly showed the *old*
deployment ID (`b0741434-...`) with "Building" still attached well after the new one had actually
gone live, and a naive poll-until-not-"Building" loop exited early once that stale text
disappeared, before the new deployment ID actually rotated in. **Don't trust `railway status`
alone for "is the new code live" — verify against the actual API**, e.g. probe a route that only
exists in the new code (here, `DELETE /innovations/:id` unauthenticated: `404` = still old code,
`401` = new route exists). Confirmed both fixes live on the real production domains (not just the
Vercel preview alias): `nir-platform-web.vercel.app` stays on English with `Accept-Language: bn`
sent, and `api-production-2d78.up.railway.app`'s `DELETE /innovations/:id` returns `401` instead of
the old `404`.

**Files touched:** none (deploy only) — `docs/SESSION_LOG.md` (this entry).

---

## 2026-08-31 (session 35) — Issue R-002: Submitter couldn't edit or delete a draft submission

**Task.** Bug report: from the Submitter Dashboard, a Submitter could create a draft, upload
photos/files, add team members, and submit for review — but had no way to edit the text fields
entered at creation, or to delete a draft outright.

**Diagnosis.** The edit path already half-existed: `PATCH /innovations/:id`
(`InnovationsService.update`) was already implemented, ownership-checked
(`assertOwnerOrAdmin`), correctly scoped to `DRAFT`/`REJECTED` for the owner, and validated via a
real `UpdateInnovationDto extends PartialType(CreateInnovationDto)` — nothing wrong with it. The
matching frontend hook, `useUpdateInnovation` in `use-innovations.ts`, also already existed — but
grep found zero callers anywhere in the app. So the gap was purely "no UI ever calls this,"
exactly like R-001's News situation, but on the frontend side only this time. Delete had no
backend endpoint at all — confirmed via the full route list on `InnovationsController` (team-
member and attachment deletes existed, whole-innovation delete didn't).

**Fix — backend** (`apps/api/src/innovations/`): added `DELETE /innovations/:id` →
`InnovationsService.remove(id, userId, roles)`. Deliberately stricter than `update`: only
`reviewStatus === 'DRAFT'` is deletable, not `REJECTED` — a rejected submission still carries
review history worth keeping, a draft nobody has looked at yet doesn't. Reused the same
`assertOwnerOrAdmin` ownership check `update` already uses. Confirmed every child relation
(team, attachments, tags, sdgTags, funding/mentor links) cascades in the Prisma schema
(`onDelete: Cascade`), so this is a clean hard delete with no orphaned rows; `AuditLog.entityId` is
a loose string reference (no FK), so the `INNOVATION_DELETED` audit entry survives the innovation
itself, same pattern `create`/`update` already use for their own audit entries.

**Fix — frontend:**
- `apps/web/src/hooks/use-innovations.ts`: added `useDeleteInnovation()` and a submitter-scoped
  `useRemoveAttachment()` (the attachment-delete endpoint already existed too — it just had no
  caller outside the Admin Repository Management page's `use-repository-admin.ts` version, which
  invalidates admin-only queries this context doesn't need).
- Extracted the entire `/submit` form field set into a new shared component,
  `apps/web/src/components/submit/innovation-form-fields.tsx` (`InnovationFormFields`,
  `InnovationFormState`, `EMPTY_INNOVATION_FORM`), and refactored `/submit/page.tsx` to use it —
  pure refactor, no behavior change to creation.
- New page `apps/web/src/app/[locale]/dashboard/innovations/[id]/edit/page.tsx`: loads the
  submission via the existing `useInnovation(id)`, pre-fills `InnovationFormFields` from it
  (`toFormState()`), guards non-`DRAFT`/`REJECTED` items with a plain "no longer editable" message
  instead of a form, and saves through `useUpdateInnovation(id)`. Unlike `/submit`, it doesn't
  auto-redirect after saving — shows an inline "Changes saved." confirmation (from the mutation's
  own `isSuccess`) and leaves the form open, since editing an existing draft is naturally a
  multi-save workflow, not a one-shot wizard; "Back to submission" / "Done editing" links take the
  user back to the manage page when they're done.
- `dashboard/innovations/page.tsx` (list) and `dashboard/innovations/[id]/page.tsx` (manage page):
  added Edit (links to the new edit page, shown whenever `canEdit` — the pages' existing
  DRAFT-or-REJECTED convention, unchanged) and Delete draft (strictly `DRAFT`-only, behind
  `ConfirmDialog`) actions. The list page's row markup had to change from a single wrapping
  `<Link>` to a `<div>` with an inner `<Link>` for the title/code, since a `<button>` can't nest
  inside an `<a>`. Also added a per-attachment Remove button on the manage page (behind the same
  `ConfirmDialog`), using the new `useRemoveAttachment` hook — the endpoint existed, nothing in the
  submitter-facing UI called it before. Skipped building a distinct "Replace file" control (unlike
  the Admin Repository Management page's `MediaManager`, which has one) — remove-then-re-upload via
  the already-existing upload button covers the same outcome without new UI surface; noted as a
  deliberate scope call, not an oversight.

**Verification.**
- API, via `curl` as `innovator1@nir.gov.bd` (fresh throwaway drafts, all cleaned up after):
  editing a draft left every untouched field unchanged (confirmed `problemStatement` survived a
  title/summary-only edit) and `reviewStatus` untouched; a non-owner (`innovator2@nir.gov.bd`) got
  403 on both edit and delete; no token got 401; submitting the draft for review
  (`UNDER_REVIEW`) made both edit and delete 400 immediately after, and confirmed even an admin
  can't force it back to `DRAFT` via `PATCH /innovations/:id/status` to reopen the hole
  (`updateStatus`'s transition table has no route back to `DRAFT`) — had to delete that one test
  row directly via Prisma since the intentionally-strict endpoints correctly refused; a full
  create → add attachment → remove attachment → delete-draft happy path all returned 200 and the
  item was confirmed gone from `GET /innovations/mine` afterward.
- UI, via Playwright against the running dev server: Edit link and Delete button appear only on
  `DRAFT` rows in the list (spot-checked against a live mix of DRAFT/MIDLISTED/UNDER_REVIEW/
  PUBLISHED items — none of the non-draft rows show either button); clicking Edit opens the edit
  page with every field correctly pre-filled; editing the title and saving shows the inline success
  message; "Back to submission" shows the updated title and unchanged DRAFT status on the manage
  page; Delete draft opens the `ConfirmDialog` with the expected copy, confirming it removes the
  item and redirects to the list, where it's gone. Screenshots of the manage page, edit page, and
  list page confirmed the new buttons match the existing design system with no unrelated layout
  changes.

**Files touched:** `apps/api/src/innovations/innovations.service.ts`,
`apps/api/src/innovations/innovations.controller.ts`, `apps/web/src/hooks/use-innovations.ts`,
`apps/web/src/components/submit/innovation-form-fields.tsx` (new),
`apps/web/src/app/[locale]/submit/page.tsx`,
`apps/web/src/app/[locale]/dashboard/innovations/page.tsx`,
`apps/web/src/app/[locale]/dashboard/innovations/[id]/page.tsx`,
`apps/web/src/app/[locale]/dashboard/innovations/[id]/edit/page.tsx` (new), `docs/API.md`,
`docs/UI_GUIDELINES.md`, `docs/ROADMAP.md` (Known issues — resolved entry), `docs/SESSION_LOG.md`
(this entry).

**Next steps.** None outstanding for this issue. If a future request wants an in-place "Replace
file" control on the submitter's own Attachments panel (matching the admin `MediaManager` UX),
that's a small addition on top of what's here — the `useReplaceAttachment`-equivalent backend
endpoint (`PATCH /innovations/:id/attachments/:attachmentId`) already exists and just needs a
submitter-scoped hook + button, same shape as this session's `useRemoveAttachment`.

---

## 2026-08-31 (session 34) — Issue R-001: Platform Admin couldn't edit News & Events

**Task.** Bug report: Platform Administrators could create, unpublish/republish, and delete News
& Events posts from `/dashboard/admin` (News tab), but there was no way to edit an existing one.

**Diagnosis.** The backend already had a fully working, `PLATFORM_ADMIN`-gated `PATCH /news/:id`
(`cms/public-content.controller.ts` → `PublicContentService.updateNews`) — nothing to build there
in principle. The gap was purely in the frontend: `NewsTab` (`dashboard/admin/page.tsx`) only ever
called that endpoint with `{ id, unpublish }` for the Unpublish/Republish toggle; there was no UI
path to send a general field edit. While wiring that up, found a real validation gap in the same
endpoint: its `@Body()` was typed `Partial<CreateNewsDto> & { unpublish?: boolean }` — a bare
TypeScript type, not a class-validator class — which NestJS's global `ValidationPipe` silently
skips at runtime (metatype resolves to `Object`, and Nest's pipe explicitly bypasses validation for
native JS types). So the update endpoint accepted **any** payload shape with no whitelist,
required-field, or type checking at all.

**Fix — backend** (`apps/api/src/cms/`): added a real `UpdateNewsDto` class
(`dto/public-content.dto.ts`, all fields `@IsOptional()` + `unpublish?: boolean`) and switched the
controller/service to use it instead of the bare `Partial<>` type, so validation actually runs.
`updateNews` now also 404s via `NotFoundException` if the id doesn't exist (previously would have
bubbled a raw Prisma error) and 409s via `ConflictException` on a duplicate `slug`
(`Prisma.PrismaClientKnownRequestError` `P2002`, same pattern already used in
`users.controller.ts`). Left `publishedAt` handling as it already was — `unpublish` is the only
field that can touch it, so a plain field-edit payload (no `unpublish` key) leaves the current
publish/unpublish state untouched in both directions; this was already correct, just re-verified.

**Fix — frontend** (`apps/web/src/app/[locale]/dashboard/admin/page.tsx`): extracted the existing
create-form JSX into a `NewsFormFields` component, added `editingId`/`editForm` state and a
`startEdit(item)` helper to `NewsTab`, and added an **Edit** button per row that swaps that row
for an inline edit card (same field set as creation, pre-filled) with Save/Cancel — mirroring the
pattern `ChallengesTab` already established for its own inline edit (first documented now, see
[UI_GUIDELINES.md](UI_GUIDELINES.md#reusable-patterns)). Save sends only the edited fields (no
`unpublish` key), reusing the existing `useUpdateNews` mutation, whose `onSuccess` already
invalidates the `admin-news` query — so the listing refreshes and shows the updated post
automatically, no extra plumbing needed. Unpublish/Republish and Delete buttons are untouched.

**Verification.**
- API, via `curl` as `admin@nir.gov.bd`: editing a published post's title left `publishedAt` set;
  editing an unpublished post's title left it `null`; a slug collision returned 409; no token
  returned 401; an `innovator1@nir.gov.bd` token returned 403; a nonexistent id returned 404; an
  unknown field returned 400 (confirms the validation fix actually took effect — this would have
  silently passed before). All test edits reverted afterward, no leftover data.
- UI, via Playwright against the running dev server logged in as `admin@nir.gov.bd`: Edit button
  present on every row; clicking it pre-filled slug/title/body/cover-image-preview correctly from
  the existing item; editing the title and saving updated the listing immediately and closed the
  edit row; the row's Unpublished/Published status and its Unpublish-or-Republish + Delete buttons
  were unchanged after the edit. Reverted the test edit afterward.

**Files touched:** `apps/api/src/cms/dto/public-content.dto.ts`, `apps/api/src/cms/public-content.controller.ts`,
`apps/api/src/cms/public-content.service.ts`, `apps/web/src/app/[locale]/dashboard/admin/page.tsx`,
`docs/API.md`, `docs/UI_GUIDELINES.md`, `docs/ROADMAP.md` (Known issues — resolved entry; Technical
debt — new entry), `docs/SESSION_LOG.md` (this entry).

**Next steps / known residual.** The same `Partial<CreateXDto> & {...}` validation-bypass pattern
this fix closed for `news` is still present on `faqs`/`challenges`/`resources`/`partners`'s PATCH
endpoints in the same controller — flagged in [ROADMAP.md](ROADMAP.md#technical-debt), not fixed
here (out of scope for this issue). Separately, `ResourcesTab`/`PartnersTab`/`FaqTab` still have no
Edit UI (create + toggle/delete only) — same inline-edit pattern would apply if that's ever asked
for; not part of this ticket.

---

## 2026-08-31 (session 33) — Ran the project locally; locale auto-detect was overriding English default

**Task 1 — run the project.** No blockers beyond the known machine-specific setup in
[SETUP.md](SETUP.md): installed `apps/web`'s `node_modules` (missing), rebuilt `apps/api` (`npm
run build`), started both with the documented workaround (`node dist/main.js` for the API instead
of `start:dev`, `npm run dev` for the web app). Confirmed API on :4000 (Swagger at `/api/docs`,
`/api/v1/reporting/public-stats` returning live data) and web on :3000 (HTTP 200), Postgres
already reachable on :5433.

**Task 2 — Ecosystem Partners marquee (built, then reverted).** User initially asked for the
homepage "Ecosystem Partners" strip to become a continuous two-row sliding/marquee animation.
Implemented it (new `marquee-ltr`/`marquee-rtl` keyframes in `tailwind.config.ts`, a two-row
duplicated-track rewrite of `partners-strip.tsx`, CSS-only hover-to-pause) and verified it worked
via Playwright. User then said the change wasn't needed after all — fully reverted
`tailwind.config.ts` and `partners-strip.tsx` to their pre-session state and removed the
marquee-related additions from `UI_GUIDELINES.md`. No trace of this feature remains in the
codebase or docs; mentioned here only so the next session doesn't reintroduce it without being
asked.

**Task 3 — default locale was silently resolving to Bangla for BN-preferring browsers.** In the
same message, user reported the default link/locale should always be English, not Bangla.
Reproduced: `curl` against `/` with `Accept-Language: bn` returned a 307 to `/bn` even though
`src/i18n/routing.ts` already declared `defaultLocale: 'en'` — next-intl's `localeDetection`
defaults to `true` and negotiates the served locale from the browser's `Accept-Language` header
on first visit (no cookie yet), which silently overrides the configured default for anyone with
a Bangla-preferring browser (i.e. most of the platform's actual audience). **Fix:** set
`localeDetection: false` in `routing.ts`. Re-verified: `/` now returns 200 (stays English)
regardless of `Accept-Language`, `/bn` still serves Bangla directly, and the `locale-switcher.tsx`
UI path (which sets the `NEXT_LOCALE` cookie explicitly) is unaffected — cookie-based preference
still works for a returning visitor who has switched before.

**Files touched:** `apps/web/src/i18n/routing.ts` (the actual fix), `docs/UI_GUIDELINES.md` (i18n
section — documented `localeDetection: false` and why), `docs/SESSION_LOG.md` (this entry).
`apps/web/tailwind.config.ts` and `apps/web/src/components/home/partners-strip.tsx` were touched
and then reverted — no net diff there.

**Next steps.** None outstanding. If auto-detecting locale from the browser is ever wanted again,
that's a deliberate product decision, not a default to fall back into — see the note in
[UI_GUIDELINES.md](UI_GUIDELINES.md#i18n--bilingual-rules).

---

## 2026-08-30 (session 32) — Fixed innovation-submission 500 (duplicate `innovationCode`)

**Task.** User ran the project and reported "Internal server error" when saving an innovation
draft from `/bn/submit`.

**Diagnosis.** Reproduced via `POST /api/v1/innovations` as `innovator1@nir.gov.bd` → HTTP 500.
Ran the API in the foreground to capture the stack trace: Prisma `PrismaClientKnownRequestError`
— `Unique constraint failed on the fields: (innovationCode)` in `InnovationsService.create`.
Root cause in `apps/api/src/common/services/id-generator.service.ts`: `nextInnovationCode()`
built the code as `NIR-<year>-<(count of this year's innovations) + 1>`. The local DB has 51
innovations but their codes already run up to `NIR-2026-000074` (the 23 test-innovation deletion
from session 12/13 left gaps at 24–27, 29, 33–44), so the generator produced `NIR-2026-000052`,
which already exists. Every insert collided, and since the insert never lands, `count` never
moved — permanently wedged. `nextIrn()` (used by self-registration in `auth.service.ts`) had the
identical count-based bug.

**Fix.** Rewrote both methods to take the running number from the highest code already issued
for the current year — `findFirst` with `where: { … startsWith: prefix }` + `orderBy … 'desc'`
(safe as a lexical sort because the suffix is zero-padded to fixed width 6) — instead of a row
count. Handles deletions and non-contiguous seed codes. Rebuilt (`npm run build` in `apps/api`),
restarted the API, re-tested: two consecutive creates now succeed as `NIR-2026-000075` /
`NIR-2026-000076`. Deleted those two test rows afterward (plus their team-member + audit-log
rows) so the next real submission is still `NIR-2026-000075` with no gap.

**Known residual.** Still a check-then-insert race under truly concurrent creates — noted in
ROADMAP known issues; closing it properly wants a Postgres sequence or a retry-on-P2002 loop.
Not addressed here (not the reported problem, not reproducible single-user).

**Files touched:** `apps/api/src/common/services/id-generator.service.ts`, `docs/ROADMAP.md`
(Known issues — Resolved entry), `docs/DATABASE.md` (ID-generation note), `docs/SESSION_LOG.md`
(this entry).

**Also this session:** started the app per the `run` skill — both dev servers (`apps/web` on
:3000, `apps/api` on :4000) were already running from a prior session; followed
[SETUP.md](SETUP.md)'s build-then-`node dist/main.js` path for the API (this machine's
`nest start --watch` is broken). Postgres reachable on :5433.

**Deploy.** Not deployed — the running Railway API has the same latent bug, but deploys on this
project only happen when explicitly asked. Flag for the next deploy: this fix should ship.

**Next steps:** none blocking. Optionally harden the generator against the concurrent-insert
race (see ROADMAP). The pre-existing uncommitted edits to `docs/DATABASE.md` / `docs/ROADMAP.md`
("48 models, 24 enums", migration 19) predate this session and are unrelated.

---

## 2026-08-30 (session 31) — Government seal added to the header identity bar

**Task.** User asked for the official Bangladesh government seal to appear before "Government of
the People's Republic of Bangladesh" in the header's top identity bar (`site-header.tsx`), small
and vertically centered with the text, on desktop/tablet/mobile alike. User supplied one SVG
(pasted inline), named `bangladesh-govt-logo-BN.svg` but containing English circular text
("GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH") — flagged the mismatch and confirmed with
the user it's actually the EN asset. Initially wired up locale-conditional switching
(`locale === 'bn' ? '/brand/govt-logo-bn.svg' : '/brand/govt-logo-en.svg'`) anticipating a
separate Bangla-text asset, but the user then said **not** to switch logos by locale at all — use
the same file for both EN and BN, unchanged when toggling language. Simplified accordingly: the
`<Image>` now has a hardcoded `src="/brand/govt-logo-en.svg"` with no locale branching, and the
now-unused `useLocale` import/call was removed from `site-header.tsx`.

**Asset:** saved as `apps/web/public/brand/govt-logo-en.svg` (new file — no pre-existing govt
seal asset existed anywhere in the repo, checked `apps/web/public/`, `Media/`, and a full
filename grep before adding it). Despite the filename, this is the one and only govt-seal asset
in the app now — used for both locales. If a genuinely different Bangla-text version is ever
wanted later, don't just add `govt-logo-bn.svg` and reintroduce the locale switch without
checking with the user first — the last two rounds of feedback on this exact feature both went
the same direction (toward one fixed asset), not toward locale-specific ones.

**Placement/sizing:** the identity bar's single `<span>` became a `flex min-w-0 items-center
gap-2` row with the logo first (`h-5 w-5 shrink-0 sm:h-6 sm:w-6`, `alt=""`/`aria-hidden` since the
adjacent text already conveys the same information to screen readers) and the existing text
`<span>` second, `min-w-0`+`truncate` preserved so the bar still degrades the same way it always
did on very narrow screens.

**Verified** via `npx playwright screenshot --viewport-size=Wx…` at 320/375/768/1280px, both
locales — logo renders compact and vertically centered next to the text at every width, and is
now byte-identical between `en` and `/bn`.

**Files touched:** `apps/web/src/components/layout/site-header.tsx`,
`apps/web/public/brand/govt-logo-en.svg` (new), `docs/SESSION_LOG.md` (this entry).

**Deploy.** Not deployed yet — pending explicit deploy instruction (this project's established
pattern: deploys only happen when asked, separately from the implementation step).

**Next steps:** none outstanding unless the user later wants a distinct Bangla-text variant.

---

## 2026-08-27 (session 30) — Hero mobile CTA buttons now equal-width

**Task.** User asked for the homepage hero's "Explore innovations" / "Submit an innovation"
buttons to render at equal width on mobile. (A same-session earlier attempt matched their
height/padding/type to the Search button instead — deployed, then reverted at the user's request
because it didn't look right — see the revert commit; this is a separate, narrower fix.)

**Fix (`components/home/hero.tsx`):** the two `Link` buttons were `inline-flex` with no width
constraint, so each auto-sized to its own text ("Submit an innovation" wider than "Explore
innovations") — visibly mismatched widths sitting in a `flex flex-wrap` row. Changed the wrapping
row to `flex-col` (stacked) with `sm:flex-row sm:flex-wrap` restoring the original side-by-side
layout at `sm:` and up, and gave both `Link`s `w-full justify-center` (unprefixed) with
`sm:w-auto`. On mobile both buttons now stretch to the full row width — identical width by
construction, not by matching text-length coincidence — and stack vertically instead of
wrapping side-by-side, since two full-width buttons couldn't share a row anyway. Desktop/tablet
(`sm:` and up) is pixel-identical to before: auto-width, side-by-side.

**Verified** via `npx playwright screenshot --viewport-size=Wx900` at 320/375/414px (equal width,
stacked) and 640/768px (unchanged, side-by-side), both `en` and `bn` locales.

**Files touched:** `apps/web/src/components/home/hero.tsx`, `docs/SESSION_LOG.md` (this entry).

**Deploy.** Pushed to `master`; Vercel auto-deploy verified against the live production HTML.

**Next steps:** none outstanding.

---

## 2026-08-25 (session 28) — Fixed hero search bar overflow the first sweep missed

**Task.** User reported (with a real-device screenshot) that the homepage hero search bar's
"Search" button was clipped/cut off at the right edge on their phone — the previous session's
sweep had reported the homepage clean, so this was a real miss to root-cause.

**Root cause — the previous audit's methodology had a blind spot, not just a missed page.**
`document.documentElement.scrollWidth > window.innerWidth` (what session 27's script gated its
offender-scan on) can be silently masked by any `overflow-hidden` ancestor, and two independent
things do that here: `home/hero.tsx`'s own `<section className="overflow-hidden">` clips overflow
inside the hero column before it reaches `documentElement`, and separately the site-wide
`challenge-popup.tsx` sets `document.body.style.overflow = 'hidden'` for as long as it's open,
which was still open (fresh session, no `sessionStorage` dismissal) during every check in session
27's script — masking the *entire* page's real overflow state on every route it isn't gated off,
not just the hero. Confirmed empirically: measuring `getBoundingClientRect()` directly (bypassing
the `scrollWidth` gate) showed the hero's search button consistently landing ~69px past the
viewport edge at 320–390px widths regardless of actual viewport width — a fixed pixel value,
because `hero.tsx`'s two-column grid (`lg:grid-cols-[1.05fr_0.95fr]`, the same bracket-syntax
pattern from session 27 pattern #1) was missing `min-w-0` on its text column, so the grid track
sized itself to the `<h1>`'s min-content (its longest unbreakable word at the fixed 40px floor of
its `clamp()` font-size) instead of the actual available width — full technical writeup in
[UI_GUIDELINES.md § Reusable patterns](UI_GUIDELINES.md#reusable-patterns).

**Fix.** `components/home/hero.tsx`: added `min-w-0` to the text-column `motion.div` (same fix
shape as every other bracket-syntax grid from session 27). Rewrote the audit script to scan every
element's own bounding rect against the viewport *unconditionally* (never gated behind
`scrollWidth`) and to dismiss the challenge popup before measuring, then re-ran it across every
public page, every dashboard role, and the dynamic detail routes — this time also at 320px, not
just 375px+. That wider/corrected sweep caught one more real bug it hadn't reached before:
`/dashboard/investor`'s "Express interest" row (a fixed `w-48` message input beside a `shrink-0`
button, no wrap) overflowed at 320px only, invisible at 375px — fixed with `min-w-0 flex-1` on the
input and `sm:w-48 sm:flex-none` to preserve the desktop width, matching pattern #2 from session 27.

**Verification.** The corrected script (unconditional per-element scan, popup dismissed, includes
320px) now reports zero overflow across every public page, every one of the 11 seeded dashboard
roles, and all five dynamic detail routes, at 320/375/768px. `npx tsc --noEmit` clean. Visually
confirmed via screenshot that the hero search bar now renders correctly at 320/360/375/390px — the
Search button fully inside the pill, heading wrapping across multiple lines instead of forcing a
fixed-width column.

**Files touched:** `apps/web/src/components/home/hero.tsx`,
`apps/web/src/app/[locale]/dashboard/investor/page.tsx`, `docs/UI_GUIDELINES.md`,
`docs/SESSION_LOG.md` (this entry).

**Deploy.** Committed and pushed to `master`. Web-only, no `apps/api` changes, so only Vercel
needed. See the commit for the exact deploy verification (`vercel inspect` /
`nir-platform-web.vercel.app` check), same procedure as session 27 and
[SETUP.md § Production Deployment](SETUP.md#production-deployment).

**Next steps:** none outstanding. If another automated mobile-overflow sweep is written in the
future, use the unconditional-scan + popup-dismiss method described in
[UI_GUIDELINES.md](UI_GUIDELINES.md#reusable-patterns) from the start, not the `scrollWidth`-gated
one session 27 used.

---

## 2026-08-25 (session 27) — App-wide mobile-responsiveness sweep

**Task.** User request: make the entire application fully mobile-responsive — no horizontal
overflow anywhere, working modals, working forms/tables/cards/nav — across phone and tablet sizes,
without changing desktop layout or breaking functionality.

**Approach.** Rather than guessing from code, installed Playwright fresh into the scratchpad (not
a project dependency, matching the precedent from session 25) and wrote a scripted audit: log in
via the real login API as every one of the 11 seeded roles, inject the resulting token into
`localStorage` under the `nir-auth` key (matching the Zustand persist shape) to skip the sign-in
UI, then visit every public route, every role's dashboard route(s), and the dynamic detail routes
(innovation detail — public/evaluator/admin/submitter variants, admin submitter-profile) at
360×740, 375×812/900, and 768×1024, checking `document.documentElement.scrollWidth >
window.innerWidth` and dumping the actual offending elements when it was. Ran this sweep
end-to-end at least twice (before and after fixes) plus several targeted re-checks per fix.

**Findings — four recurring bug classes, not isolated one-offs (full technical detail in
[UI_GUIDELINES.md § Reusable patterns](UI_GUIDELINES.md#reusable-patterns), so not duplicated
here):**
1. Two-column layouts built with Tailwind's bracket `grid-cols-[Xpx_Ypx]` syntax lack the implicit
   `minmax(0, 1fr)` that plain `grid-cols-N` gets for free, so a dense child can force the mobile
   single-column layout wider than the viewport. Fixed with `min-w-0` on both grid-item children in
   6 files: `innovation-detail.tsx`, `repository-browse.tsx`, `dashboard-shell.tsx`, and the three
   innovation-detail-shaped pages under `dashboard/{admin/evaluations,evaluations,innovations}/[id]`.
2. `shrink-0` on an action-button cluster stops it being squeezed but does not make it wrap — real
   106px horizontal overflow on `/dashboard/admin/repository`'s row of
   Publish/Unpublish/Archive/Media/Activity buttons, and a readability bug (not overflow) on
   `/dashboard/admin`'s Challenges tab where the title column got crushed to an unreadable sliver.
   Fixed both with `w-full sm:w-auto` (stacks full-width on mobile, letting the cluster's own
   `flex-wrap` activate; reverts to inline alongside the title at `sm:`).
3. Unconstrained native `<select>` elements in filter toolbars — Chromium sizes them to their
   widest `<option>` regardless of container width. Fixed the Category selects (and, for
   consistency, the Search input, Status select, and date-range inputs alongside them) on
   `/dashboard/admin/evaluations` and `/dashboard/admin/repository`.
4. Long uploaded-filenames in attachment-list links had no truncation, overflowing their row on 4
   different innovation-detail-style pages (submitter's own, evaluator's, admin's, and the public
   repository detail's admin-only panel). Fixed with `shrink-0` on the icon + `min-w-0 truncate` on
   a wrapping `<span>` around the filename text.

**Verification.** Final sweep after all fixes: **zero horizontal overflow** across every public
page, every role's dashboard (all 11 seeded accounts), all five dynamic detail routes, and the
register form with each optional role's conditional fields (Investor/Mentor chip-multi-selects)
expanded — at 360/375/768px. `npx tsc --noEmit` clean. Re-verified both existing modals
(`challenge-popup.tsx`, `confirm-dialog.tsx`) still render correctly within a short 640px mobile
viewport with both action buttons reachable — neither needed changes, the session-25 fix already
held. Did not touch: dark mode (out of scope, not wired up per
[UI_GUIDELINES.md](UI_GUIDELINES.md#layout-rules)), any backend/API code, any visual redesign
beyond the responsiveness fixes themselves — desktop layout is pixel-unchanged (every fix used
`sm:`/`lg:`-gated classes that only take effect below the existing breakpoints already used
elsewhere in the app).

**Files touched:** `apps/web/src/components/repository/innovation-detail.tsx`,
`apps/web/src/components/repository/repository-browse.tsx`,
`apps/web/src/components/dashboard/dashboard-shell.tsx`,
`apps/web/src/app/[locale]/dashboard/admin/evaluations/[innovationId]/page.tsx`,
`apps/web/src/app/[locale]/dashboard/admin/evaluations/page.tsx`,
`apps/web/src/app/[locale]/dashboard/admin/page.tsx`,
`apps/web/src/app/[locale]/dashboard/admin/repository/page.tsx`,
`apps/web/src/app/[locale]/dashboard/evaluations/[innovationId]/page.tsx`,
`apps/web/src/app/[locale]/dashboard/innovations/[id]/page.tsx`, `docs/UI_GUIDELINES.md`,
`docs/ROADMAP.md`, `docs/SESSION_LOG.md` (this entry).

**Deploy.** Committed (`289c827`) and pushed to `master`. Web-only changes, no `apps/api` or
schema changes, so only Vercel needed — no Railway deploy. Auto-deploy fired within ~21s (another
successful data point for the intermittent-auto-deploy note in
[SETUP.md § Production Deployment](SETUP.md#production-deployment)), built cleanly, confirmed
`Ready` via `vercel inspect` (`dpl_4mpvJKG3YZMXSYWZKXwQsnt28Sfs`), correctly aliased to
`nir-platform-web.vercel.app`, and confirmed the alias serves it (`200` on a direct request).

**Next steps:** none outstanding for this task. If a new two-column detail-style layout is added
later, apply pattern #1 above from the start rather than rediscovering it.

---

## 2026-08-23 (session 26) — Limit homepage category grid to 6 on mobile

**Task.** User request: on mobile, "Browse by category" (homepage) should show only the top 6
categories, everything else about the section unchanged (desktop keeps showing all 20).

**Fix.** `components/home/category-grid.tsx` — pure CSS, no data change: all categories are still
fetched via `useCategories()` and mapped as before, but each pill's `className` now conditionally
includes `index < 6 ? 'inline-flex' : 'hidden sm:inline-flex'` instead of a static `inline-flex`.
Below the existing `sm:` (640px) breakpoint (same breakpoint already used elsewhere in the app for
mobile-only toggles, e.g. `repository-browse.tsx`, `featured-innovations.tsx`) only the first 6
render; at `sm:` and up, all render — identical to the pre-change desktop output. "Top 6" is
whatever order `GET /categories` returns (not re-sorted by count or otherwise), documented in
[UI_GUIDELINES.md § Reusable patterns](UI_GUIDELINES.md#reusable-patterns).

**Verification.** `tsc --noEmit` clean. Playwright against the running dev server: counted 20
total category links present in the DOM with 6 visible at 375×900 and 20 visible at 1440×1000;
screenshots confirm mobile shows exactly the first 6 pills stacked one-per-row above the existing
"See every category" link (unchanged), and desktop is pixel-identical to the pre-change layout.

**Files touched:** `apps/web/src/components/home/category-grid.tsx`, `docs/UI_GUIDELINES.md`,
`docs/SESSION_LOG.md` (this entry).

**Deploy.** Committed (`08bb906`) and pushed to `master`. Web-only, no `apps/api` changes, so no
Railway deploy needed. Vercel's GitHub auto-deploy fired within ~10s and built cleanly; confirmed
`Ready` via `vercel inspect` (`dpl_8WAVLFJUS6kaTYYEbogVtBN2GiK7`), correctly aliased to
`nir-platform-web.vercel.app`, and confirmed the alias serves it (`200` on a direct request) —
another successful data point for the intermittent-auto-deploy note in
[SETUP.md § Production Deployment](SETUP.md#production-deployment).

**Next steps:** none outstanding.

---

## 2026-08-23 (session 25) — Fixed mobile modal/popup overflow

**Task.** User reported the popup(s) worked fine on desktop but on mobile: grew larger than the
viewport, sometimes covered the whole screen, the close (×) button became unreachable, and
content could overflow. Requirement: fix mobile without touching desktop behavior/layout.

**Root cause.** Neither modal in the app (`components/layout/challenge-popup.tsx`,
`components/ui/confirm-dialog.tsx`) capped its own height — only the outer overlay was
viewport-bound (`fixed inset-0`). When a modal's content was taller than the mobile viewport
(mainly `challenge-popup.tsx`, which stacks a banner image + title + description + date info +
button row), the box just grew past the screen; the overlay's `items-center` then centered that
oversized box so roughly half the overflow sat above the visible top edge — including the close
button, which was `absolute`-positioned inside that same growing box.

**Fix.** Applied a consistent pattern to both modals (documented in
[UI_GUIDELINES.md § Reusable patterns](UI_GUIDELINES.md#reusable-patterns) as "Mobile-safe modal
sizing pattern"): modal box gets `max-h-[calc(100dvh-2rem)]` (the `2rem` matches the overlay's
existing `p-4`, so the box mathematically can never exceed the visible viewport) and the long
content wrapper gets `overflow-y-auto` so content scrolls instead of the box growing. In
`challenge-popup.tsx` specifically, restructured to `flex flex-col` with the close `<button>` as a
sibling *outside* the new `overflow-y-auto` div (it was previously a sibling of the scrollable
content inside the same unconstrained box) — keeping it outside the scrolling wrapper means it
never scrolls out of reach, which was the actual reported bug. Also switched that modal's padding
from `p-8` to `p-6 sm:p-8` (slightly more room on narrow screens; desktop `sm:` breakpoint keeps
`p-8` unchanged). `confirm-dialog.tsx` got the same `max-h`/`overflow-y-auto` defensively (its
content is short today, but the pattern costs nothing and keeps both modals consistent).

**Verification.** `tsc --noEmit` clean. Used Playwright (installed fresh into the scratchpad, not
added as a project dependency) against the running dev server with a real seeded `OPEN` challenge
(banner image + long description) to check three viewports (375×667, 360×480 — a short/landscape-
ish case, and 1440×900 desktop): confirmed the popup box and close button both stay fully within
viewport bounds at all three, confirmed the close button's screen position is unchanged after
scrolling the content to the bottom (i.e. it doesn't scroll away), confirmed the close button is
still clickable and closes the dialog post-scroll, and confirmed the desktop screenshot is
visually unchanged from the pre-fix layout (unclipped, all buttons visible, no scrollbar needed).

**Files touched:** `apps/web/src/components/layout/challenge-popup.tsx`,
`apps/web/src/components/ui/confirm-dialog.tsx`, `docs/UI_GUIDELINES.md` (new pattern note),
`docs/SESSION_LOG.md` (this entry).

**Deploy.** Committed (`7e63589`) and pushed to `master`. No `apps/api` changes in this commit, so
no Railway deploy was needed — web-only. Vercel's GitHub auto-deploy fired within seconds this
time (another data point for the intermittent-auto-deploy note in
[SETUP.md § Production Deployment](SETUP.md#production-deployment)) and built cleanly; confirmed
`Ready` in Production via `vercel inspect` (`dpl_6C3HvgsNhxfwtAZP5MeegeSNr4c3`), correctly aliased
to `nir-platform-web.vercel.app`, and confirmed the alias serves it (`200` on a direct request).

**Next steps:** none outstanding. If a third modal is ever added, follow the documented pattern
rather than re-deriving it.

---

## 2026-08-17 (session 24) — Deployed Archive/Featured + Pagination

**Task.** Push and deploy the two commits from sessions 22–23 (`3384515` Archive/Featured actions,
`ef72281` pagination), which had been left committed locally but unpushed at the user's request
at the end of session 22.

**Deploy.** `git push origin master`, then `railway up --service api --detach --json` for
`apps/api` (no DB migration needed — both `ARCHIVED` and `isFeatured` already existed in the
schema from earlier sessions). Railway build succeeded (`● Online`). Verified live against the
production API: `PATCH /innovations/:id/featured` (new endpoint) toggles correctly and reverts
cleanly, and `?page=&pageSize=` on `GET /innovations/admin/repository` returns correct
`total`/`totalPages`. Vercel's GitHub auto-deploy **fired correctly this time** (~2 min, aliased to
`nir-platform-web.vercel.app`, confirmed via `vercel inspect`) — see the updated note in
[SETUP.md § Production Deployment](SETUP.md#production-deployment) for how this data point fits
with the earlier no-op.

**Next steps:** none outstanding.

---

## 2026-08-17 (session 23) — Pagination for Repository Management

**Task.** Add full pagination to the Admin Repository Management list: page-size selector
(10/20/50), Previous/Next + page-number navigation, current-page/total-record display, correct
interaction with search/filter/status, and no unexpected page jumps after admin actions.

**Finding.** The backend (`InnovationsService.findForRepositoryManagement`) already did server-side
pagination — `skip`/`take`, `total`, `totalPages` were all there from session 21. Nothing to
change on the API side; this was purely a missing frontend affordance.

**Frontend.**
- New `components/ui/pagination.tsx` — record-count summary, optional page-size `<select>`,
  Previous/Next buttons, and windowed page numbers with `…` ellipsis for large page counts (shows
  all pages when ≤7, otherwise pins first/last/current/current±1/current±2). First reusable
  pagination component in the codebase — `repository-browse.tsx` (public `/repository` search)
  has an older, simpler inline flat page-number list with no Previous/Next or count; left as-is
  rather than retrofitted, since that wasn't part of this task.
- `useRepositoryInnovations` now sets `placeholderData: keepPreviousData` (TanStack Query v5) so
  paging, filtering, and post-action refetches keep the current rows visible (dimmed via
  `isFetching`) instead of flashing a blank loading state — this is what satisfies "maintain the
  appropriate list position... without causing unexpected pagination changes," since page state
  itself was already stable (mutations invalidate the query but don't touch `filters`, so the
  fetch simply re-runs for the same page/filter combination).
- Added a `useEffect` that clamps `filters.page` back to `data.totalPages` if an action (e.g.
  archiving the last remaining item on the last page) shrinks the result set below the current
  page — otherwise the admin would land on a silently empty page with only "Previous" to escape.
- `RepositoryFilters` gained an explicit `pageSize` field (defaults to 20, matching the backend
  DTO default); page-size changes reset to page 1, ordinary filter changes already did (unchanged
  behavior from session 21).

**Verification.** Type-checks clean. Verified server-side pagination directly against the local
API with `pageSize=2` across two pages (no duplicate/missing items) and combined with `status` +
`q` filters simultaneously. Confirmed the page compiles and loads in the dev server with no
runtime errors. **Not done:** no browser available in this environment, so the actual click-through
UX (page-number window rendering, dimmed-during-fetch state, the empty-page clamp firing) wasn't
visually verified — only confirmed via code review, type-checking, and direct API calls.

**Docs.** UI_GUIDELINES.md (new component), PROJECT_CONTEXT.md (pagination behavior folded into
the existing Repository Management bullet).

**Next steps:** none outstanding.

---

## 2026-08-17 (session 22) — Archive + Featured actions in Repository Management

**Task.** Follow-up to session 21: add Archive and Featured/Unfeatured actions to each innovation
in the Admin Repository Management module. Both mapped onto existing infrastructure rather than
needing new concepts — `ARCHIVED` was already a valid `ReviewStatus` (and already a valid
transition target from `APPROVED`/`PUBLISHED`/`UNPUBLISHED`), and `Innovation.isFeatured` already
existed and already powered the homepage's Featured section; neither had an admin-facing way to be
set from this module before now.

**Backend.**
- New `PATCH /innovations/:id/featured` (`UpdateFeaturedDto: { featured: boolean }`) →
  `InnovationsService.updateFeatured` — deliberately a dedicated endpoint rather than routed
  through the generic `PATCH /innovations/:id` update, so the audit entry
  (`INNOVATION_FEATURED_CHANGED`) carries a real `{from, to}` instead of the generic update's
  metadata-less `INNOVATION_UPDATED`. `PLATFORM_ADMIN, SYSTEM_ADMIN` only.
- Archive needed **no new backend logic at all** — it's `PATCH /innovations/:id/status` with
  `reviewStatus: 'ARCHIVED'`, already valid in `ALLOWED_TRANSITIONS` and already fully audit-logged
  via the existing generic code path.
- `RepositoryFilterDto.status` broadened to accept `ARCHIVED`. `findForRepositoryManagement`'s
  *default* (unfiltered) scope intentionally stays `APPROVED`/`PUBLISHED`/`UNPUBLISHED` — archived
  innovations only show up when the admin explicitly filters to `ARCHIVED`, keeping the everyday
  view uncluttered while keeping archived items findable.

**Frontend.** Repository Management page: a Star icon button per row toggles Featured (no
confirmation — reversible, non-destructive, matches the pre-existing Challenge featured-toggle
pattern in `dashboard/admin/page.tsx`), and an Archive button (with a confirmation dialog, since
this is explicitly a "remove from the active repository" action) replaces the Publish/Unpublish
buttons once an innovation is already `ARCHIVED` — no un-archive button exists here by design,
since `ARCHIVED`'s only forward transition is `-> UNDER_REVIEW` (full pipeline restart via
Moderation, unchanged). Added `ARCHIVED` to the status filter dropdown and to the page's local
`STATUS_STYLES` map.

**Verification.** Both apps type-check clean. Verified live against the local API: toggled
Featured on, confirmed it appears in `GET /repository/featured` only while `PUBLISHED` (correctly
absent while the same innovation was `UNPUBLISHED`), archived it, confirmed a 404 for
unauthenticated `GET`, confirmed it's excluded from both `GET /repository/featured` and the
`admin/repository` default listing but present under `?status=ARCHIVED`, and confirmed the
activity log recorded both `INNOVATION_FEATURED_CHANGED` and `INNOVATION_STATUS_CHANGED` with
correct before/after values. Restored the seeded test innovation back to its original
`PUBLISHED`/not-featured state afterward via a one-off `ts-node` script (deleted after use, same
convention as prior sessions' scratch scripts) — `ARCHIVED`'s restricted transition path meant the
normal API couldn't get it back to `PUBLISHED` directly. **Not done:** no browser available in
this environment, so visual verification (star icon states, button layout) wasn't possible.

**Docs.** Updated API.md (new/changed routes, corrected an inaccuracy left over from session 21
where the repository listing's default scope was already broadened to include `APPROVED` in code
but the doc still said "PUBLISHED/UNPUBLISHED only"), DATABASE.md (new audit action), and
PROJECT_CONTEXT.md (expanded the Repository Management business-rule bullet).

**Next steps:** none outstanding.

---

## 2026-08-17 (session 21) — Admin Repository Management module

**Task.** Built a full Admin Repository Management module per user spec: view
published/approved-but-unpublished/unpublished innovations, publish/unpublish, manage photo/video
attachments (upload/replace/remove), a per-action activity log, confirmation before critical
actions, and search/filter (title/code, category, status, publication date).

**Schema.** Added `UNPUBLISHED` to `ReviewStatus` (migration
`20260817054146_add_unpublished_review_status`), applied locally; will apply to Railway
automatically on next `railway up` via the existing `prisma migrate deploy` in `deploy.startCommand`
(see [SETUP.md](SETUP.md#production-deployment)). Mirrored the new value into
`packages/shared/src/enums.ts` per its documented hand-sync convention and rebuilt
(`npm run build:shared`).

**Backend (`apps/api/src/innovations/`).**
- `ALLOWED_TRANSITIONS`: `PUBLISHED <-> UNPUBLISHED`, both also reaching `ARCHIVED`.
  `APPROVED -> PUBLISHED` unchanged (first-publish path).
- `addAttachment`/`removeAttachment` now write `AuditLog` entries (`INNOVATION_MEDIA_UPLOADED`/
  `_REMOVED`) — they didn't before. New `replaceAttachment` (`PATCH
  /innovations/:id/attachments/:attachmentId`) swaps a media file in place and writes
  `INNOVATION_MEDIA_REPLACED` with `{previousUrl, newUrl}`, instead of remove+add logging two
  unrelated entries.
- New `findForRepositoryManagement` (`GET /innovations/admin/repository`) — filtered/paginated
  list scoped to `APPROVED`/`PUBLISHED`/`UNPUBLISHED` (the set this module cares about), ordered
  by `publishedAt desc` with `nulls: 'last'` (needed so never-published `APPROVED` rows don't jump
  ahead of recently-published ones under Postgres's default DESC-nulls-first behavior).
- New `listActivityLog` reading the pre-existing `AuditLog` table, which had no read endpoint at
  all until now — exposed as `GET /innovations/:id/activity-log` (one innovation) and `GET
  /innovations/admin/activity-log` (repository-wide feed).
- **Bug fixed along the way:** `PATCH /innovations/:id/status`'s controller `@Roles` guard was
  missing `SYSTEM_ADMIN` (had `PLATFORM_ADMIN` only) even though `assertOwnerOrAdmin` and every
  other admin-gated endpoint already treat the two as equivalent per [ROLES.md](ROLES.md). Added
  it.
- All new admin routes (`admin/repository`, `admin/activity-log`, `:id/activity-log`) gated to
  `PLATFORM_ADMIN, SYSTEM_ADMIN` only — narrower than the existing `updateStatus`/attachment
  endpoints they reuse under the hood (those stay open to Institutional Coordinator/Innovation
  Manager too, unchanged, since the Moderation page already relies on that).

**Frontend.** New `/dashboard/admin/repository` page + nav item (Platform/System Admin only):
status pills (extended `STATUS_STYLES` with `APPROVED`/`UNPUBLISHED` — and, since a submitter's
own innovation can land on `UNPUBLISHED` if an admin takes it down, added the same entry to
`dashboard/innovations/page.tsx` and `dashboard/innovations/[id]/page.tsx`'s `STATUS_STYLES` too,
per the existing documented warning in [UI_GUIDELINES.md](UI_GUIDELINES.md) that a missed entry
silently renders with no pill color), search/category/status/date filters, per-innovation media
manager (hover-to-replace/remove on each photo/video thumbnail, upload buttons for new ones), and
an expandable activity-log panel per innovation plus a repository-wide "Recent activity" panel.
Built `components/ui/confirm-dialog.tsx` — first confirmation-dialog component in this codebase
(no prior `window.confirm` or modal-confirm precedent existed) — used for unpublish, media
remove, and media replace.

**Verification.** Both apps type-check clean. Verified the full flow live against the local API
(not just reading code): unpublished a real seeded innovation, confirmed it 404s for an
unauthenticated `GET` while still visible to the admin, confirmed the activity log recorded the
correct actor/from/to/note, republished it, then added/replaced/removed a test photo attachment
and confirmed each step logged its own `AuditLog` entry. Confirmed the broadened `APPROVED` listing
query runs cleanly (0 results in current seed data — no `APPROVED`-and-unpublished innovations
exist yet — but the default `admin/repository` listing still correctly returns all 37 published
items). **Not done:** no browser/Playwright available in this environment, so the page's visual
rendering (modal layout, hover states) was not screenshot-verified — only confirmed to compile and
return 200.

**Deploy.** Committed (`b376154`) and pushed to `master`. Railway (`apps/api` + Postgres) deployed
cleanly via `railway up --service api --detach --json` — `prisma migrate deploy` applied the
`UNPUBLISHED` migration to the production DB automatically as part of the existing
`deploy.startCommand`, verified live (`GET /innovations/admin/repository` against
`api-production-2d78.up.railway.app` returns real data, no schema errors).

**Vercel auto-deploy did not fire for this push** — the GitHub→Vercel Git integration set up
earlier today (see the session below) had worked for a small doc-only test push (new deployment
within ~25s) but produced *no* deployment at all (checked directly via the Vercel API's
`/v6/deployments` list, not just `vercel ls`) for this much larger 22-file commit, even after
10+ minutes. GitHub's commit-status/check-runs API showed 0 entries for both the working and
non-working push, so that wasn't a useful differential signal. Root cause not identified — worked
around by falling back to manual `vercel --prod --yes` (documented as the fallback path in
[SETUP.md](SETUP.md#production-deployment)), which succeeded normally. Noted as an open reliability
question in SETUP.md; if it recurs, check the Vercel dashboard's Git integration delivery log
(not accessible via the CLI/API surface used here).

**Docs.** Updated DATABASE.md (enum + AuditLog read-path), API.md (all new/changed routes),
ROLES.md (new nav route + the `SYSTEM_ADMIN` status-guard fix), UI_GUIDELINES.md (new component +
status-color entries), PROJECT_CONTEXT.md (Features table + a new detailed business-rule bullet),
ROADMAP.md (marked the "no dedicated Publish UI" known issue resolved, added a Completed entry),
SETUP.md (the auto-deploy reliability gap above).

**Next steps:**
- If `APPROVED`-but-unpublished innovations start existing in practice, worth revisiting whether
  the Admin Evaluations page's "Reviewed" tab and this module's listing overlap in a confusing way
  — they don't currently (Reviewed shows terminal states including `APPROVED`; this module
  additionally offers the actual publish action for those rows), but hasn't been used with real
  `APPROVED`-heavy data yet.
- Watch whether the Vercel auto-deploy webhook gap above recurs on the next normal push; if it
  does, it needs actual investigation (dashboard delivery logs) rather than another manual-deploy
  workaround.

---

## 2026-08-17 (session 19) — Removed demo accounts list from sign-in page

**Task.** User asked to remove the "Demo accounts" block from the sign-in page. Deleted the
`DEMO_ACCOUNTS` constant, its `Role`/`ROLE_LABELS` imports, and the scrollable accounts list JSX
from `apps/web/src/app/[locale]/sign-in/page.tsx` (form, SSO buttons, and "create account" link
untouched). Verified with `tsc --noEmit` (clean) and a local dev-server request to `/en/sign-in`
(200). This resolves the tech-debt item in [ROADMAP.md](ROADMAP.md) about the three-way
`DEMO_ACCOUNTS` / `PROJECT_CONTEXT.md` / `seed.ts` duplication — `PROJECT_CONTEXT.md`'s Demo
Accounts table is now the only place this list is documented.

**Note:** the `demoNoteHeader` i18n key (`en`/`bn` message files) is now unused but was left in
place — low-priority cleanup, not done this session.

**Also noted, not acted on:** an untracked file `Documents/NIR Test ID Password` exists in the
repo working directory — left out of git entirely (not staged, not committed) since the filename
suggests it may hold credentials. Flagged to the user; nobody has confirmed its contents or
whether it should be `.gitignore`d.

**Deploy.** Committed the sign-in change and docs updates, pushed to `master`
(https://github.com/Nipun7744/nir-platform), redeployed `apps/web` to Vercel
(`nir-platform-web`) via `vercel --prod --yes` per [SETUP.md](SETUP.md#production-deployment) —
no Railway/API changes this session, so the backend wasn't touched.

**Next steps:** none outstanding from this session beyond the two low-priority notes above.

---

## 2026-08-17 (session 20) — GitHub-to-Vercel CI/CD

**Task.** Connected `nir-platform-web` to `github.com/Nipun7744/nir-platform` via
`vercel git connect` (Vercel's native Git integration). First attempt failed because the Vercel
GitHub App wasn't yet authorized on the repo — user completed that one-time authorization in
GitHub's UI, then the connect command succeeded. Pushes to `master` now auto-deploy to
production; other branches/PRs get preview deployments. Verified end-to-end by pushing this very
doc update and confirming a new deployment appeared automatically (not via manual CLI). Manual
`vercel --prod --yes` still works as a fallback. Full detail in
[SETUP.md § Production Deployment](SETUP.md#production-deployment).

**Bug found and fixed during verification.** The first git-triggered production deploy failed:
`Module not found: Can't resolve '@nir/shared'`. Root cause: the Vercel project's Build Command
had always been unset/default (`next build` only, inside `apps/web`) — it never built
`packages/shared`. This had been silently masked for days on manual `vercel --prod` deploys by
build-cache carryover (a `packages/shared` build cached from early in the project's history kept
getting reused); a fresh git clone has no such cache. Fixed by explicitly setting `buildCommand`
to `cd ../.. && npm run build:shared && cd apps/web && npm run build` via the Vercel API. Verified
by pushing this doc update itself and confirming the resulting git-triggered deploy succeeded
clean. See [SETUP.md](SETUP.md#production-deployment) for the full command.

**Next steps:** none.

---

## 2026-08-13 (session 18) — Pushed to GitHub, cleaned test data, deployed to Vercel + Railway

**Task 1 — GitHub.** Repo had no git history at all. Installed GitHub CLI (`winget install
GitHub.cli`), authenticated as `Nipun7744` via device-code browser flow, added a repo-root
`.gitignore` (`node_modules/`, `.env*`, `dist/`, `.next/`, `apps/api/uploads/`, etc. — verified
nothing secret got staged before committing), initialized git, committed 298 files, and pushed to
a new public repo: https://github.com/Nipun7744/nir-platform. Commit identity set locally
(repo-scoped, not `--global`) to the GitHub account's noreply address since no global git identity
existed on this machine.

**Task 2 — DB cleanup ("clean all test cases from the DB").** No `TestCase` model exists;
interpreted as manually-created dev/QA data mixed into the **local** dev DB (`nir_dev`, `:5433`).
Found via one-off Prisma scripts (`apps/api/scratch-*.ts`, deleted after use): 24 innovations and
11 users matching `%test%`. Excluded two false positives before deleting: `NIR-2025-000007`
("Portable Water Quality **Testing** Kit" — real seeded data, not test data) and two users
(`prelim-test@nir.gov.bd`, `authenticity-test@nir.gov.bd` — despite the name, both have real
`ReviewComment` history on a genuine innovation, `NIR-2026-000017` Cold-Chain Vaccine Tracker;
deleting them would have hit a FK restrict on `ReviewComment.authorId` and orphaned real review
history). Net result: **23 innovations + 9 users deleted** via `prisma.innovation.deleteMany` /
`prisma.user.deleteMany` (cascades handled the rest — schema already has `onDelete: Cascade` on
essentially every innovation/user-scoped child table). This incidentally resolves the
`test118`/`test119`-at-`PUBLISHED` item that was sitting in [ROADMAP.md](ROADMAP.md) Known Issues
(both were in the deleted set). Seeded demo accounts and the 30 bulk-imported innovations from
session 12 were untouched.

**Task 3 — Vercel + Railway deployment.** Full command-level detail now lives in
[SETUP.md § Production Deployment](SETUP.md#production-deployment) — summary here:
- `apps/api` + PostgreSQL → Railway (project `nir-platform`). Build/start commands via a
  repo-root `railway.json` (monorepo-aware: builds `packages/shared` before `apps/api`). Fresh
  64-byte JWT secrets generated for production (not the local dev placeholders). A Railway volume
  is mounted at `/data/uploads` (`UPLOAD_DIR` env var) so uploads survive redeploys. Seeded once
  via a temporary edit to `railway.json`'s `startCommand` (`railway ssh` and
  `railway tcp-proxy create` — the two normal ways to reach Railway's internal-only Postgres from
  a local machine — were both blocked by this environment's agent-safety classifier; reverted the
  start command after confirming the seed ran via `railway logs`). Live at
  https://api-production-2d78.up.railway.app.
- `apps/web` → Vercel (project `nir-platform-web`), linked at the **repo root** (not
  `apps/web/`) with `rootDirectory: apps/web` + `sourceFilesOutsideRootDirectory: true` set via
  `vercel api -X PATCH` — linking from inside `apps/web/` directly (tried first) uploads only that
  directory and the build fails resolving the `@nir/shared` workspace package. `NEXT_PUBLIC_API_URL`
  set to the Railway URL for Production + Preview. Live at https://nir-platform-web.vercel.app.
- Wired `CORS_ORIGIN` on Railway to the Vercel URL; verified end-to-end (not just "build
  succeeded"): CORS preflight header correct, `/repository` page's JS bundle contains the Railway
  hostname (not `localhost`), and a real login against `admin@nir.gov.bd` / `Password123!` returned
  a valid access token from the production API.
- Found an unrelated pre-existing Vercel project on the same account, `a2i-nir` (created
  2026-07-21-ish, `rootDirectory: platform/web`, references a Strapi CMS backend) — different
  stack entirely, not a prior deployment of this repo. Left untouched.
- **Discovered while wiring `CORS_ORIGIN`**: root `.env.example` documented `WEB_ORIGIN` but
  `apps/api/src/main.ts` actually reads `CORS_ORIGIN` — fixed `.env.example` directly (one-line,
  not worth tracking as debt).

**Environment quirks hit along the way** (also in [SETUP.md](SETUP.md)): Git Bash auto-converts
leading-`/` CLI arguments to Windows paths, which broke `railway volume add --mount-path
/data/uploads` and `vercel api /v9/...` — switched to PowerShell for both. `railway volume add
--service X` (flag after the subcommand) panics the CLI; `railway service link X` first, then the
un-flagged form, works.

**Next steps**: no dedicated `DEPLOYMENT.md` exists — deployment info lives in `SETUP.md` per the
existing doc set; revisit if it grows enough to warrant its own file. The temporary-seed-via-
startCommand approach for Railway should not be repeated as a habit — if seeding production
becomes routine, worth either a real one-off Railway job/cron or getting `tcp-proxy`/`ssh` access
approved for this environment.

---

## 2026-08-13 (session 12) — Local env started; bulk-imported 30 innovations from external template

**Task 1 — ran the app locally:** built `apps/api` (`tsc` workaround per [SETUP.md](SETUP.md) —
`nest start --watch` is still broken on this machine) and started it via `node dist/main.js`;
started `apps/web` via `npm run dev`. Postgres was already running on `:5433`. Opened Prisma
Studio (`npx prisma studio`, port 5555) as the DB browser, since pgAdmin still won't launch from
a script on this machine (see [SETUP.md](SETUP.md) known issues).

**Task 2 — bulk import of 30 innovations as `PUBLISHED`:** source was
`Documents/Innovation Bulk Import Template.xlsx`, sheet "4 DB USE ONLY" (30 data rows). Wrote
`apps/api/scripts/import-innovation-bulk.ts` (one-off, not wired into `npm run` scripts) plus
`apps/api/scripts/bulk-import-rows.json` (the sheet parsed to JSON via a scratch `xlsx` install —
`xlsx` is **not** an `apps/api` dependency, don't `import` it from app code). Ran once with
`npx ts-node scripts/import-innovation-bulk.ts` from `apps/api`; all 30 rows created
(`NIR-2026-000045` through `NIR-2026-000074`), 0 skipped, 0 errors. `totalInnovations` went from 8
to 38 (`GET /reporting/public-stats`).

- All 30 attributed to `submittedById: admin@nir.gov.bd` (the sheet has no real platform accounts
  for external submitters) — original "Submitter Full Name" is preserved as a team member with
  role "Submitter" instead.
- `reviewStatus: PUBLISHED`, `submittedAt`/`publishedAt` set to import time, `isFeatured: false`.
- **Rows 29–50 of the sheet (16 of the 30 imported) were missing required fields**
  (`Category*`, `Innovation Type*`, and often `Problem Statement*`/`Proposed Solution*`) — these
  are older a2i/gov-funded projects with only a title/summary on record, not full submissions.
  The script's `ROW_OVERRIDES` map supplies a best-guess `category`/`innovationType`/
  `developmentStage` per row from the title/summary text (e.g. blockchain document-verification
  projects → `governance-public-service`; NISE/Teachers Portal international deployments →
  `education-skills`, `PILOT_IMPLEMENTED`), and `problemStatement`/`proposedSolution` fall back to
  the English summary when blank. **These 16 records should be spot-checked in the admin UI** —
  the inference is reasonable but not authoritative. See `ROW_OVERRIDES` in the script for exactly
  which rows and what was guessed.
- Team-member parsing handles three formats found in the sheet inconsistently:
  `;`-separated `Name:Role` pairs, `,`-separated `Name:Role` pairs (comma-merge heuristic so a
  role description containing commas doesn't get split into fake extra members), and plain
  `Name, freeform role text` with no colon at all.

**Next steps:** review the 16 inferred-category innovations (`NIR-2026-000059` through
`NIR-2026-000074`, plus `NIR-2026-000066`/`000067`) in `/dashboard/admin` and correct
category/type/stage where the guess is wrong; delete `apps/api/scripts/import-innovation-bulk.ts`
and `bulk-import-rows.json` once confirmed no re-run is needed (they're one-off, not meant to be
part of the regular seed path).

---

## 2026-08-12 (session 11) — Running-challenge popup, admin edit, featured flag, start/end timeline

**Task 1 — site-wide "running challenge" popup:** added `components/layout/challenge-popup.tsx`,
mounted once in `app/[locale]/layout.tsx` (site-wide, not homepage-only). Shows the current
`status: OPEN` challenge in a modal on first visit; gated off `/dashboard`, `/sign-in`,
`/register` via `usePathname()`; shown at most once per browser session per challenge
(`sessionStorage`, keyed by `challenge.slug`), so it doesn't re-appear on every route change but
does resurface in a new session or when a different challenge goes OPEN. New translation keys
under `home.challengePopup` in both `messages/en.json` / `messages/bn.json`. Follows the existing
"no shared Modal primitive" convention (local `useState`, not an extracted component) — see
[UI_GUIDELINES.md](UI_GUIDELINES.md).

**Task 2 — featured/priority challenge, admin edit, start/end timeline** (follow-up in the same
session, from an admin-panel screenshot showing the Challenges tab had no edit affordance and
only a single "Deadline" date field):

- **Schema** (migration `20260812042528_add_challenge_featured_timeline`): added
  `Challenge.isFeatured Boolean @default(false)` and `Challenge.startDate DateTime?`. Existing
  `deadline` field is reused as the timeline's end date (not renamed, to avoid an API-breaking
  migration) — see [DATABASE.md](DATABASE.md#component-4--communication--cms).
- **Backend**: `CreateChallengeDto` gained `isFeatured`/`startDate` (both optional).
  `createChallenge`/`updateChallenge` in `cms/public-content.service.ts` enforce a **single**
  featured challenge at a time — setting `isFeatured: true` on one row first `updateMany`s every
  other `Challenge` to `isFeatured: false` in the same call, so the "featured/priority" concept
  the admin sets is always unambiguous for the public UI to read.
- **Admin UI** (`dashboard/admin/page.tsx`'s `ChallengesTab`): every challenge row now has an
  **Edit** button that swaps the row for the same field set used by "Open a new challenge"
  (pre-filled, Save/Cancel) — previously only `status` and delete were editable post-creation. Also
  added a star toggle to mark/unmark a challenge as featured, and a Start date field alongside the
  existing deadline field (both now labeled, since two unlabeled date inputs side by side would be
  ambiguous — the rest of the app relies on placeholder-only labels, this is a deliberate
  exception).
- **Public UI**: homepage banner (`challenge-banner.tsx`) and the popup (task 1) both switched
  their single-OPEN-challenge selection to `openChallenges.find(isFeatured) ?? openChallenges[0]`
  — see the "Picking 'the' running challenge" entry in [UI_GUIDELINES.md](UI_GUIDELINES.md). All
  four public challenge surfaces (banner, popup, `/challenges` list, `/challenges/[slug]` detail)
  now render `startDate – deadline` as a timeline when `startDate` is set, falling back to the
  original single-deadline display otherwise (so pre-existing challenges without a `startDate`
  still render correctly) — plus a small "Featured" badge on the list/detail pages.

**Files touched:** `apps/api/prisma/schema.prisma` (+migration), `apps/api/src/cms/dto/public-content.dto.ts`,
`apps/api/src/cms/public-content.service.ts`, `apps/web/src/hooks/use-content.ts` (`ChallengeDto`),
`apps/web/src/components/layout/challenge-popup.tsx` (new),
`apps/web/src/components/home/challenge-banner.tsx`,
`apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/app/[locale]/dashboard/admin/page.tsx`
(`ChallengesTab`), `apps/web/src/app/[locale]/challenges/page.tsx`,
`apps/web/src/app/[locale]/challenges/[slug]/page.tsx`, `apps/web/messages/{en,bn}.json`.

**Verification:** `tsc --noEmit` clean on both apps, API rebuilt and restarted (had to kill the
old `node dist/main.js` process first — Windows locks the Prisma query-engine `.dll` while a
process holds it, so `prisma generate` EPERM's if the old server is still running; see
[SETUP.md](SETUP.md) if this recurs), live round-trip via `curl` (login as `admin@nir.gov.bd`,
`PATCH /challenges/:id` with `isFeatured`/`startDate`, confirmed both persist), all four public
routes (`/`, `/challenges`, `/challenges/[slug]`, plus the popup's mount point in the root layout)
compile and 200 with no new console errors in the dev server log.

**Not verified — no browser automation in this environment (repeat of prior sessions' gap):**
actual visual/interactive check of the popup's animation, the timeline range rendering correctly
in the browser DOM, or the admin edit form's Save/Cancel flow end-to-end through the UI (only the
underlying `PATCH` was exercised directly). If picking this up next, a human visual pass or adding
a browser-automation tool (see session 10's closing note, same open item) would close this gap for
good instead of re-flagging it every session.

**Next steps:** none blocking. Possible follow-ups: allow Bangla (`titleBn`/`descriptionBn`)
fields in the admin challenge form (currently English-only, matching how the rest of the CMS admin
forms work — not a regression, just a pre-existing gap this session didn't touch); consider
whether `startDate` should be validated as `<= deadline` server-side (currently unvalidated, same
level of rigor as the rest of this DTO).

---

## 2026-08-12 (session 12) — Challenge banner image

**Task:** add a banner image option for each challenge (follow-up in the same day as session 11's
featured/timeline/edit work).

- **Schema** (migration `20260812043826_add_challenge_banner_image`): added
  `Challenge.bannerImageUrl String?`, mirroring `NewsPost.coverImageUrl`. `CreateChallengeDto`
  gained the matching optional field; no service-layer changes needed (already spread through
  `...dto`).
- **Admin UI**: generalized the existing (News-tab-only) `ImageUploadField` component with an
  optional `placeholder` prop, then reused it as-is in the Challenges tab's create/edit form
  (upload button + URL field + live preview, same `POST /uploads` flow as everywhere else) rather
  than writing a second image-upload widget. Also added a small thumbnail per row in the admin
  challenge list when a banner is set.
- **Public UI**: all four challenge surfaces now show the banner when present, each falling back
  to its pre-existing behavior when not: homepage banner (`challenge-banner.tsx`) uses it in place
  of the previously-hardcoded static image; the popup (`challenge-popup.tsx`) gained a new
  full-width image slot above the content (required restructuring its padding from the outer card
  onto an inner wrapper so the image can bleed to the card's edges); `/challenges` list shows a
  small thumbnail per row; `/challenges/[slug]` detail shows a full hero image below the title,
  matching the existing news-detail-page pattern exactly (`aspect-video`, rounded, `next/image`
  with `fill`).

**Files touched:** `apps/api/prisma/schema.prisma` (+migration), `apps/api/src/cms/dto/public-content.dto.ts`,
`apps/web/src/hooks/use-content.ts` (`ChallengeDto`), `apps/web/src/app/[locale]/dashboard/admin/page.tsx`
(`ImageUploadField`, `ChallengesTab`), `apps/web/src/components/home/challenge-banner.tsx`,
`apps/web/src/components/layout/challenge-popup.tsx`, `apps/web/src/app/[locale]/challenges/page.tsx`,
`apps/web/src/app/[locale]/challenges/[slug]/page.tsx`.

**Verification:** `tsc --noEmit` clean; API rebuilt and restarted (same Windows Prisma-DLL-lock
workaround as session 11 — kill the old `node dist/main.js` before `prisma migrate dev`/`generate`,
see [SETUP.md](SETUP.md)); live round-trip via `curl` (`PATCH /challenges/:id` with
`bannerImageUrl`, confirmed persisted); all four public routes plus `/dashboard/admin` compile and
200 with no new console errors in the dev server log.

**Not verified** (same recurring gap as session 11 and earlier — no browser-automation tool in
this environment): the actual visual result — image aspect ratios, the popup's restructured
padding/rounded corners around the new image slot, the admin thumbnail sizing. A human visual pass
would close this for good; see session 10's note and [ROADMAP.md](ROADMAP.md).

**Next steps:** none blocking.

---

## 2026-08-12 (session 13) — Submitter-facing status relabel: Longlisted / Shortlisted

**Task:** the innovation submitter's "My innovations" list and detail page showed the raw
`ReviewStatus` enum value (e.g. "SHORTLISTED" right after Authenticity Review passes) — the user
wanted a simpler, submitter-facing vocabulary: Primary Reviewer pass and Authenticity Reviewer
pass should both read "Longlisted", and only an Expert Evaluation pass should read "Shortlisted".

**Decision:** relabel display text only, in exactly the two submitter-facing files — did **not**
touch the underlying `ReviewStatus` enum, its Prisma schema, `ALLOWED_TRANSITIONS` in
`innovations.service.ts`, or any reviewer/admin page. Renaming the actual enum would have had a
large blast radius (it's read/written across preliminary-review, authenticity-review, evaluations,
moderation, pipeline, ministries, reporting, and the admin evaluations pages — all of which must
keep using the real stage names for reviewers/admins to operate correctly) for what the user
described as a display-only concern ("Rest of the tag is ok. No need to change"). Confirmed via
`innovations.service.ts`'s `ALLOWED_TRANSITIONS` and `evaluations.service.ts` (evaluators pull
their queue from `reviewStatus: 'SHORTLISTED'`) that the existing pipeline already is
`DRAFT → UNDER_REVIEW → AUTHENTICITY_REVIEW → SHORTLISTED → SELECTED → PUBLISHED/ARCHIVED`, and
that `SELECTED` is exactly "passed Expert Evaluation, admin/coordinator made the final call" (set
via the generic `PATCH /innovations/:id/status`, exercised from the Moderation page) — so the
requested three-stage submitter vocabulary maps cleanly onto four existing internal values with no
new state needed.

**Implementation:** in `dashboard/innovations/page.tsx` and `dashboard/innovations/[id]/page.tsx`
only, added a `SUBMITTER_STATUS_LABELS` map (`AUTHENTICITY_REVIEW` → "LONGLISTED", `SHORTLISTED` →
"LONGLISTED", `SELECTED` → "SHORTLISTED") and a `submitterStatusLabel()` helper, falling through to
the previous `reviewStatus.replace(/_/g, ' ')` for `DRAFT`/`UNDER_REVIEW`/`REJECTED`/`PUBLISHED`/
`ARCHIVED` (left exactly as they were, per "rest of the tag is ok"). Added a `STATUS_STYLES` entry
for `AUTHENTICITY_REVIEW` (previously missing — that status silently rendered with no pill color at
all, a small pre-existing bug this happened to touch) pointing at the same clay color `SHORTLISTED`
already used, so both raw stages that now read "Longlisted" also look identical. See
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules) and [UI_GUIDELINES.md](UI_GUIDELINES.md)
for the full mapping and the duplicated-not-extracted rationale.

**Files touched:** `apps/web/src/app/[locale]/dashboard/innovations/page.tsx`,
`apps/web/src/app/[locale]/dashboard/innovations/[id]/page.tsx`. No backend or schema changes.

**Verification:** `tsc --noEmit` clean; confirmed live seeded data via `curl` (`innovator1@nir.gov.bd`
has innovations at `SHORTLISTED` and `UNDER_REVIEW` today, matching the screenshot the user
attached) — those will now render "Longlisted" and "Under review" respectively; both routes compile
and 200 in the dev server log with no new errors.

**Not verified** (same recurring gap — no browser-automation tool in this environment): the actual
rendered pill text/color in a browser. A human visual pass on `/dashboard/innovations` (as
`innovator1@nir.gov.bd`) would confirm "Longlisted" now shows where "Shortlisted" used to, and
would also be the moment to sanity-check whether the clay/amber color choice for "Longlisted" reads
well next to the `StagePill` next to it — no design review happened here beyond reusing an
existing color token.

**Next steps:** none blocking. If a submitter later needs a fourth intermediate label (e.g.
distinguishing "just entered Authenticity Review" from "passed it"), the two-values-collapse-to-one
"Longlisted" mapping would need revisiting — currently both raw stages are indistinguishable to the
submitter by design, per this session's request.

---

## 2026-08-12 (session 14) — Evaluator-driven auto-transition: Longlisted / Midlisted / Shortlisted

**Task:** finalize and implement the three-tier submitter-facing status scheme from session 13's
follow-up request — distinct `LONGLISTED`/`MIDLISTED`/`SHORTLISTED` tags (not two of them
collapsed into one), reviewer buttons renamed to match, and — the part that needed a real
architecture decision — the Expert Evaluator's own SHORTLIST/REJECT decision must *automatically*
change the innovation's status, with no Admin/Coordinator manual follow-up step and no generic
"Move to SELECTED" button representing it.

**Investigation before implementing:** confirmed via `submitEvaluation()` (unchanged at the time)
that Expert Evaluators submitting a score/recommendation never touched `Innovation.reviewStatus`
at all — the only thing that moved `SHORTLISTED -> SELECTED` was a coordinator/admin manually
clicking one of three interchangeable buttons on the generic Moderation queue page, disconnected
from what any evaluator actually recommended. Asked the user to confirm the intended fix (relabel
only vs. wire the evaluator's action to the transition vs. hybrid) before touching it, since this
was a real behavior change, not just a rename.

**Backend implementation** (`apps/api/src/evaluations/evaluations.service.ts`,
`.../dto/submit-evaluation.dto.ts`, `apps/api/src/innovations/innovations.service.ts`):
- `SubmitEvaluationDto.recommendation` is now **required** (was optional).
- `submitEvaluation()` now runs the `Evaluation.create` and the conditional `Innovation.update` in
  one `$transaction`: if the innovation is still at `SHORTLISTED` when the evaluator submits,
  `SHORTLIST` → `SELECTED`, `REJECT` → `REJECTED`, both writing `reviewRemarks` from the
  evaluator's comment (same "latest note" convention every earlier stage already follows). Guarded
  on `reviewStatus === 'SHORTLISTED'` at write time so a second assigned evaluator's later
  submission — multiple evaluators can legitimately be assigned to the same innovation, via panel
  assignment or category auto-match — gets recorded but can't re-fire or clobber a decision another
  evaluator already made; first to submit SHORTLIST/REJECT wins. A legacy `FUND` recommendation
  value (kept in the enum, no longer offered by the evaluator UI) intentionally triggers no
  transition — an early draft of this logic used a two-way ternary that would have silently treated
  `FUND` as `REJECT`; caught and fixed before shipping by making the third branch explicit.
- `findOneForViewer`'s `evaluatorVisibleStatuses` gained `REJECTED` — without this, an evaluator
  whose own REJECT decision just flipped the status would immediately 404 on their own read-only
  "you already submitted" summary view, since `REJECTED` wasn't previously in the evaluator-visible
  list. Caught by tracing the visibility check, not by observed failure.
- No schema/migration needed anywhere in this session — every status this workflow uses
  (`AUTHENTICITY_REVIEW`, `SHORTLISTED`, `SELECTED`, `REJECTED`) already existed, and
  `SHORTLISTED -> SELECTED`/`REJECTED` were already valid entries in `ALLOWED_TRANSITIONS`; this
  was purely an application-layer change in *who* triggers the transition and *when*.

**Frontend:**
- `dashboard/evaluations/[innovationId]/page.tsx`: replaced the "Recommendation" dropdown (Reject/
  Shortlist/Recommend for funding) + generic "Submit evaluation" button with two direct-action
  buttons, "Shortlist" and "Reject", each submitting immediately with that decision baked in.
- `dashboard/preliminary-review/page.tsx`: pass button "Shortlist" → "Longlist" (copy only; still
  transitions to `AUTHENTICITY_REVIEW`). Description text updated to match.
- `dashboard/authenticity-review/page.tsx`: pass button "Shortlist" → "Midlist" (copy only; still
  transitions to `SHORTLISTED`). Description text updated to match.
- `dashboard/moderation/page.tsx`: removed `SELECTED` from `NEXT_STATUS['SHORTLISTED']` — that
  generic admin button no longer exists; `REJECTED`/`ARCHIVED` remain as manual overrides.
- `dashboard/innovations/page.tsx` + `dashboard/innovations/[id]/page.tsx`: `SHORTLISTED` now maps
  to "MIDLISTED" instead of collapsing into "LONGLISTED" (session 13's interim mapping), with its
  own clay color; `AUTHENTICITY_REVIEW`'s "LONGLISTED" got a new distinct blue
  (`bg-blue-50 text-blue-600`) instead of sharing clay with the old collapsed state.
- `hooks/use-evaluations.ts`: `useSubmitEvaluation`'s `recommendation` is now required and typed
  `'SHORTLIST' | 'REJECT'`; `onSuccess` invalidates `['innovation', variables.innovationId]`,
  `['shortlisted-evaluations']`, and `['moderation-queue']` in addition to the pre-existing
  `['assigned-evaluations']`, so a status change from this action is reflected elsewhere in the
  same browser session without a hard reload.

**Verification — live end-to-end through the real pipeline, not just `tsc`:** created two fresh
test innovations as `innovator1@nir.gov.bd`, walked each through
`preliminary@nir.gov.bd` → `authenticity@nir.gov.bd` → `evaluator@nir.gov.bd`/`evaluator2@nir.gov.bd`
via the actual API (not a script bypassing it). Confirmed: (1) SHORTLIST path —
`reviewStatus` went `SHORTLISTED -> SELECTED` in the same request as the evaluator's `POST
/evaluations` call, zero admin action taken; (2) REJECT path — same but to `REJECTED`, and the
rejecting evaluator could still load the innovation afterward (the visibility fix); (3) a second
evaluator (`evaluator@nir.gov.bd`) submitting `SHORTLIST` on the already-`REJECTED` second test
innovation was recorded but did not overwrite the status — guard confirmed under a real duplicate-
decision scenario, not just read from the code; (4) Admin's separate final `SELECTED -> PUBLISHED`
step (unmodified this session) still works independently; (5) `innovator1`'s full "My Innovations"
list, pulled live, confirmed a pre-existing seeded innovation at raw `SHORTLISTED` now correctly
displays "MIDLISTED" — the relabeling works on old data, not just freshly created test rows. Also
ran `tsc --noEmit` clean on both apps, and confirmed every touched route compiles with no console
errors in the dev server log. The two test innovations were archived (`ARCHIVED`) afterward via the
admin API to keep demo data clean, since one had reached `PUBLISHED` and briefly appeared in the
public repository — there is no `DELETE /innovations/:id` endpoint, so archiving was the available
cleanup.

**Not verified** (same recurring gap noted every session — no browser-automation tool in this
environment): the actual rendered pill colors/text and button labels in a browser. Everything above
was verified against the real API and real seeded accounts, which is a stronger signal than most
past sessions' `curl`-only checks, but a human visual pass would still be the only way to confirm
the three colors are actually visually distinct enough and that the two-button evaluator UI reads
clearly.

**Next steps:** none blocking. Worth revisiting if it comes up: what should happen when multiple
evaluators disagree (currently strictly first-decision-wins, no consensus/majority logic — this
matches what was asked for literally, "the status update must happen immediately after the
evaluator submits," but is worth flagging if a future request wants aggregation instead); whether
`FUND` should get its own UI again or be removed from the enum entirely now that nothing offers it.

---

## 2026-08-12 (session 15) — Fixed: evaluator-shortlisted innovations vanished from Admin's Pending tab

**Bug, introduced by session 14 in the same day:** the Admin Evaluations page
(`dashboard/admin/evaluations/page.tsx`) has Pending/Reviewed tabs meant to show, respectively,
innovations awaiting the Admin's final decision vs. ones already decided. Its filter logic
(`status === 'SHORTLISTED'` → Pending; `{SELECTED, REJECTED, PUBLISHED, ARCHIVED}` → Reviewed) was
written back when an Expert Evaluator's shortlist recommendation did *not* itself change
`reviewStatus` — the innovation just sat at `SHORTLISTED` until an admin manually moved it to
`SELECTED`, so `SHORTLISTED` was a correct proxy for "pending admin action." Session 14 changed
`submitEvaluation()` to apply that transition automatically, immediately moving the status to
`SELECTED` the moment the evaluator submits — which this page was never updated for, so a
freshly-shortlisted innovation now landed straight in "Reviewed" (since `SELECTED` was in that
set) despite the Admin never having looked at it. Caught by the user re-specifying the workflow
with an explicit "Admin Pending List" stage and stating plainly that a shortlisted innovation "must
become visible to the Admin in the Pending list" — re-reading that against the actual tab-filter
code made the regression obvious.

**Fix:** swapped the sets — `PENDING_STATUS = 'SELECTED'`, `REVIEWED_STATUSES =
{'REJECTED', 'PUBLISHED', 'ARCHIVED'}` (dropped `SELECTED` from Reviewed, since that's now Pending;
kept `REJECTED` in Reviewed for a real edge case: `GET /evaluations/shortlisted` returns
`Evaluation` rows with `recommendation: 'SHORTLIST'` regardless of the innovation's current status,
so if a *second* assigned evaluator submits a stray `SHORTLIST` vote *after* a *first* evaluator's
`REJECT` already settled the innovation at `REJECTED` — session 14's guard means that vote is
recorded but doesn't override the status — that row must still classify as settled/"Reviewed," not
re-appear as "Pending"). No backend change needed this session; this was purely a stale frontend
assumption.

**Verification — live, reproducing both real scenarios, not just reading the code:**
1. Walked a fresh test innovation through Primary → Authenticity → Expert Evaluator (`SHORTLIST`)
   via the real API, then fetched `GET /evaluations/shortlisted` as admin and ran the exact same
   filter predicate the page uses against the live response — confirmed it now classifies as
   `PENDING` (previously would have been `REVIEWED`).
2. Reproduced the stray-second-evaluator-vote edge case for real: `evaluator3` rejects a second
   test innovation (→ `REJECTED`), then `evaluator4` (no prior relationship to it, but Expert
   Evaluators can evaluate any evaluator-visible-status innovation regardless of category —
   confirmed `findOneForViewer` has no per-category gate on evaluation submission, only
   `listAssignedToMe`'s auto-match queue does) submits a `SHORTLIST` afterward — confirmed the
   innovation stays `REJECTED` (session 14's guard held) and that evaluator4's vote correctly
   classifies as `REVIEWED`, not `PENDING`.
3. `tsc --noEmit` clean; `/dashboard/admin/evaluations` compiles and 200s with no console errors.
4. Archived both test innovations afterward (no `DELETE` endpoint exists) to keep demo data clean.

**Not verified** (recurring gap, no browser-automation tool in this environment): the actual
rendered tab counts/contents in a browser — verified by replaying the page's exact filter logic
against live API data instead, which is a strong proxy but not the same as seeing the rendered UI.

**Next steps:** none blocking. Worth a human visual pass on `/dashboard/admin/evaluations` as
`admin@nir.gov.bd` to see real Pending-tab contents now that the semantics are corrected.

---

## 2026-08-12 (session 16) — Approval save now finalizes + redirects (closes out the "mystery redirect" report)

**Context:** the user had earlier reported that clicking "Save approval decisions" redirected to
"the evaluation page" — at the time, a full code review found no redirect logic anywhere in that
component, so I hardened the button (`type="button"`) and did a clean dev-server restart as
plausible-but-unconfirmed fixes, and asked for reproduction details. This session's request
resolved the mystery: the user wasn't reporting a bug, they were specifying the *intended* behavior
they expected but that didn't yet exist — clicking Save should both finalize the innovation
(closing out the Admin's review) and redirect back to the Pending list. So this session builds that
feature for real, rather than continuing to chase a phantom bug.

**Task:** wire the Admin Evaluations detail page's "Save approval decisions" button to (1) also
apply the Admin's final selection decision, moving the innovation off the Pending tab, (2) redirect
back to the Pending Evaluations list only after the save actually succeeds, (3) show a "Approval
decision saved successfully" notification.

**Design decision:** "Admin's final selection decision" already has an established meaning in this
app from prior sessions — `reviewStatus: SELECTED -> PUBLISHED`, exercised via the Moderation page.
Rather than inventing a new status or a second parallel "finalized" concept, `PATCH
/innovations/:id/approval` (`InnovationsService.updateApproval`) now accepts an optional `finalize`
flag: when true and the innovation is still `SELECTED`, the same call that saves the
Recognition/Mentor/Fund approval fields also flips `reviewStatus -> PUBLISHED` and sets
`publishedAt`, atomically. Needed a flag (rather than making every approval-save finalize
unconditionally) because `ApprovalSection` reuses this one endpoint for two different actions: the
deliberate "Save approval decisions" click, and the incidental save that fires when an admin
uploads a replacement approval letter (`handleLetterUpload`) — only the former should ever publish
or navigate away. `finalize` is set by the former, omitted by the latter. No schema/migration
change — `PUBLISHED` and `publishedAt` already existed and were already reachable from `SELECTED`.

**Backend:** `UpdateApprovalDto` gained `finalize?: boolean`. `updateApproval()` destructures it
out before building the Prisma `data` object (it's not a real column) and conditionally adds
`reviewStatus: 'PUBLISHED', publishedAt: new Date()`, guarded on `innovation.reviewStatus ===
'SELECTED'` — a second `finalize: true` call on an already-published innovation is a safe no-op,
confirmed live.

**Frontend:**
- `ApprovalSection.handleSave()` now sends `finalize: true` and, only in `onSuccess`,
  `router.push('/dashboard/admin/evaluations?saved=1')`.
- `dashboard/admin/evaluations/page.tsx` reads `?saved=1` (`useSearchParams`), shows a dismissible
  green success banner, and `router.replace()`s the clean URL so it doesn't reappear on
  refresh/back-navigation. Because this introduced the app's second `useSearchParams()` consumer,
  the page was split into an inner content component wrapped in `<Suspense>` by the default export
  — mirrors the existing pattern in `repository/page.tsx` (the only other consumer), avoiding a
  Next.js build-time warning/error for un-suspended `useSearchParams`.
- `useUpdateInnovationApproval`'s `onSuccess` now also invalidates `shortlisted-evaluations` and
  `moderation-queue`, not just the one innovation, so the status change is reflected elsewhere in
  the same browser session.

**Verification — live through the real API, not just code review:** walked a fresh test innovation
through the full pipeline to `SELECTED` (Pending) via the real demo accounts, confirmed via `PATCH
.../approval` with `finalize:true` that it flips to `PUBLISHED` with `publishedAt` set and the
approval fields saved in the same response; replayed the Admin Evaluations page's exact tab-filter
logic against the live result and confirmed it now classifies as Reviewed, not Pending; confirmed a
second `finalize:true` call on the already-published innovation is a no-op; separately walked a
second test innovation to `SELECTED` and confirmed the letter-upload-style call (`approvalLetterUrl`
only, no `finalize`) leaves it at `SELECTED` (still Pending) as intended. `tsc --noEmit` clean; both
`/dashboard/admin/evaluations` and its `[innovationId]` detail route compile and 200 with no console
errors. Test innovations archived afterward (no `DELETE` endpoint) to keep demo data clean.

**Not verified** (recurring gap, no browser-automation tool in this environment): the actual
rendered banner, its 6-second auto-dismiss timing, and the redirect's visual smoothness in a real
browser. Also specifically not verified: whether the original "mystery redirect" report was in fact
this exact missing feature all along, since the user never confirmed a root cause for the earlier
report — treating this session's explicit spec as the authoritative resolution either way.

**Next steps:** none blocking. If an innovation has no Recognition/Mentor/Fund request at all,
`ApprovalSection` still renders no action button (`hasAnyRequest` gate, unchanged, pre-existing) —
an admin finalizing *that* case still has to use the Moderation page's generic "Move to PUBLISHED".
Not addressed this session since it wasn't asked for; flagging in case "every Pending innovation
should be finalizable from this one page" turns out to be the next ask.

---

## 2026-08-12 (session 17) — New APPROVED status: Admin Approval ≠ Publication, read-only after decision

**Task:** the previous session made "Save approval decisions" finalize an innovation by moving it
straight to `PUBLISHED`. The user corrected this: Admin Approval and Publication must be two
separate events, never the same status/action — saving an approval decision should mark the
innovation `APPROVED`, not `PUBLISHED`; publication stays a separate, later step. Additionally,
once an innovation has moved from Pending to Reviewed, its approval section must become read-only
— no re-entering, editing, or resubmitting a decision.

**Schema change:** added `APPROVED` to the `ReviewStatus` enum (migration
`20260812101124_add_innovation_approved_status`), inserted between `SELECTED` and `PUBLISHED`. Also
updated `packages/shared/src/enums.ts`'s hand-kept copy of `ReviewStatus` to match (documented
convention in DATABASE.md — nothing currently imports it for this enum, but keeping it accurate for
whenever something does) and rebuilt `packages/shared`.

**Backend** (`innovations.service.ts`):
- `ALLOWED_TRANSITIONS['SELECTED']` changed from `['PUBLISHED', 'ARCHIVED']` to
  `['APPROVED', 'ARCHIVED']`; added `ALLOWED_TRANSITIONS['APPROVED'] = ['PUBLISHED', 'ARCHIVED']`.
- `updateApproval()`: `finalize: true` now sets `reviewStatus: 'APPROVED'` (was `'PUBLISHED'`) and
  no longer sets `publishedAt` at all — publication remains untouched by this endpoint.
- `evaluatorVisibleStatuses` (in `findOneForViewer`) gained `APPROVED`, mirroring the `REJECTED`
  fix from two sessions ago — an evaluator whose shortlisted innovation gets approved shouldn't
  404 when revisiting it.

**Frontend:**
- `dashboard/admin/evaluations/page.tsx`: `REVIEWED_STATUSES` gained `'APPROVED'` (the normal
  outcome now lands here, not in `PUBLISHED` as it briefly did last session).
- `dashboard/admin/evaluations/[innovationId]/page.tsx`: `ApprovalSection` now branches on a new
  `isReadOnly = innovation.reviewStatus !== 'SELECTED'`. Read-only renders a new
  `ApprovalReadOnly` component (static badge + saved comment, no inputs) per requested support
  type, hides the letter-upload control and the Save button entirely, and shows a "Decision saved
  — read-only" pill next to the heading. Editable path is otherwise unchanged.
- `dashboard/moderation/page.tsx`: `STATUS_FILTERS` gained `'APPROVED'`;
  `NEXT_STATUS['SELECTED']` retargeted to `['APPROVED', 'ARCHIVED']` (kept, not removed, as the
  only escape hatch for innovations with zero Recognition/Mentor/Fund requests, where
  `ApprovalSection` shows no button at all); added `NEXT_STATUS['APPROVED'] = ['PUBLISHED',
  'ARCHIVED']` — this remains the only way to actually publish, since no dedicated "Publish" UI
  exists yet.
- `dashboard/innovations/page.tsx` + `.../[id]/page.tsx`: added `APPROVED: 'bg-brand-100
  text-brand-800'` to `STATUS_STYLES` (same shade `PUBLISHED` uses) so the submitter's pill doesn't
  silently render with no color — the exact bug fixed once before for `AUTHENTICITY_REVIEW`, now
  guarded against for every new status added. No new `SUBMITTER_STATUS_LABELS` entry — `APPROVED`
  falls through to the default `reviewStatus.replace(/_/g, ' ')` and reads "APPROVED" as-is.

**Verification — live through the real API and demo accounts:** walked a fresh test innovation to
`SELECTED` (Pending) via the full pipeline, confirmed `finalize: true` now produces
`reviewStatus: 'APPROVED'` with `publishedAt: null`; confirmed it classifies as Reviewed;
confirmed it's still `404` from an unauthenticated public fetch (not leaked as published);
confirmed a repeat `finalize` call is a no-op; confirmed the separate, later
`PATCH .../status {reviewStatus: 'PUBLISHED'}` call (the Moderation page's action) still works and
sets `publishedAt` correctly, proving the two events remain genuinely independent. `tsc --noEmit`
clean; all three touched routes compile and 200 with no console errors. Test innovation archived
afterward.

**Not verified** (recurring gap — no browser-automation tool in this environment): the actual
rendered read-only view, the "Decision saved — read-only" pill, and whether `ApprovalReadOnly`'s
badge styling reads clearly next to the pre-existing `RequestBadge` component it was modeled on.

**Next steps:** none blocking. The previous session's diagnostic accidentally published a real
demo innovation (`test118`, `cmspudqi30046eaandgfeono2`) before `APPROVED` existed — it's still
sitting at `PUBLISHED` today; flagged to the user at the time, never reverted since no follow-up
request came. No dedicated "Publish" UI exists yet (`APPROVED -> PUBLISHED` is still
Moderation-page-only) — flagged in the prior session's log too and still open; worth building if a
future request asks for it explicitly.

---

## 2026-08-11 (session 10) — Fixed: Expert Evaluator comments missing from admin single-innovation page

**Bug:** on the admin single-innovation evaluation page
(`dashboard/admin/evaluations/[innovationId]/page.tsx`, added session 8), the "Expert evaluations"
sidebar card showed each evaluator's name, recommendation, and total score, but silently dropped
their written comments — the exact gap flagged as a risk in session 9's write-up ("could not
visually verify the rendered UI in an actual browser"). Caught by the user from a screenshot.

**Root cause:** `EvaluationsSummaryCard` never rendered `evaluation.comments` — `GET
/evaluations/by-innovation/:id` already returns the field (confirmed live: Dr. Farhana Islam's full
`Smart AgriSense` write-up was present in the API response the whole time), it just wasn't in the
JSX. Not a backend gap, not present anywhere else — the Expert Evaluator's own view of their own
evaluation (`dashboard/evaluations/[innovationId]/page.tsx`) already shows `comments` correctly and
was unaffected.

**Fix:** one line — added `{evaluation.comments && <p className="mt-1.5 text-xs leading-relaxed
text-ink-600">{evaluation.comments}</p>}` under the score line in `EvaluationsSummaryCard`.
Verified `GET /evaluations/by-innovation/:innovationId` returns `comments` for the live seeded
evaluation, `tsc --noEmit` clean, page recompiles with no errors in the running dev server.

**Next steps:** none — this closes the specific gap session 9 flagged as unverified. The broader
point stands: this environment still has no browser-automation tool, so a human visual pass remains
the only way to fully verify frontend changes here.

---

## 2026-08-11 (session 9) — Admin Evaluation page: Date Range filter, Category filter, Pending/Reviewed tabs

**Task:** add a Date Range filter (From/To, no time), a Category filter, and Pending/Reviewed tabs
to `/dashboard/admin/evaluations`, all combinable, without breaking existing functionality — reuse
existing fields/APIs/status logic rather than inventing new ones.

**Pre-implementation clarification (per the task's explicit instruction to ask rather than assume
on anything unclear):** the codebase had no prior concept of "reviewed by the Admin" to reuse
directly — the page's own data doesn't record any admin action distinct from either (a)
`Innovation.reviewStatus` progressing past `SHORTLISTED`, or (b) the Permission & Approval fields
added last session (2026-08-11, session 8). Asked the user via `AskUserQuestion` rather than
guess; confirmed:
1. **"Reviewed" = `Innovation.reviewStatus` has moved past `SHORTLISTED`** (to `SELECTED`,
   `REJECTED`, `PUBLISHED`, or `ARCHIVED`); "Pending" = still `SHORTLISTED`. Ruled out
   approval-fields-based definition since innovations with no support requested would never have
   anything to approve and would be permanently stuck "Pending" under that reading.
2. **Date field = `Evaluation.submittedAt`** (falling back to `createdAt`) — the same field the
   list already groups by month with, so "the existing field already in this view."
3. **The "Other IP flags (not shortlisted)" panel stays unfiltered** — tabs/filters apply only to
   the main "Shortlisted by evaluators" list.

**Implementation (`apps/web`, no backend changes):** all in
`dashboard/admin/evaluations/page.tsx`. Confirmed first that `GET /evaluations/shortlisted`
(`useShortlistedEvaluations()`) already returns everything needed per item —
`innovation.reviewStatus`, `innovation.category` (full object), `submittedAt` — so this is a pure
client-side filter, no new endpoint/query params/DB fields:
- `TABS` (`PENDING`/`REVIEWED`) styled identically to the existing Preliminary Review page's tab
  buttons (`rounded-full border`, `border-brand-300 bg-brand-50 text-brand-800` when active).
- Date Range: two `aria-label`ed `<input type="date">` (no library — none installed, and native
  date inputs already give a calendar UI with no time picker for free), each constrained via
  `min`/`max` to the other's current value so an inverted range can't be picked. Compared inclusive
  of both endpoints using local-time day boundaries (`${date}T00:00:00` through
  `${date}T23:59:59.999`), not raw date-string comparison.
- Category: `<select>` populated from the existing `useCategories()` hook (`GET /categories`),
  with an "All categories" default option.
- All three combine via `Array.filter` AND logic in one `useMemo`; a "Reset filters" button (shown
  only when a filter is active) clears date/category without touching the active tab.
- Empty state differentiates "no results because of your filters" from "genuinely nothing in this
  tab yet" (tab-specific message when no filters are active).
- `groupByMonth` (the existing month-grouping helper, unchanged) now runs over the filtered list
  instead of the raw one; the "Other IP flags" panel's `otherFlags`/`flagsByInnovationId`
  computations still use the raw, unfiltered `shortlisted`/`ipFlags` data, per the scope decision
  above.

**Verification:** `npx tsc -p tsconfig.json` (the web app's own `noEmit` config) came back clean.
Hit the page through the running dev server — compiled with no errors, 200 response. Re-implemented
the exact same filter predicate in a standalone Node script against the live
`GET /evaluations/shortlisted` response (as `admin@nir.gov.bd`) to check real numbers: 7 Pending
(`SHORTLISTED`), 13 Reviewed (`PUBLISHED`), 2 items in neither tab (`UNDER_REVIEW` — innovations
that regressed after being shortlisted+evaluated; correctly excluded from both tabs by design, same
as how the Preliminary/Authenticity Reviewer dashboards don't try to bucket every possible status).
Confirmed category narrowing (Agriculture & Food Security: 4 Reviewed / 2 Pending), date-range
narrowing (a July–August range returned a subset, a January–April range correctly returned zero),
and inclusive single-day boundary matching (a range with From=To=an item's own date still matched
it). **Could not visually verify the rendered UI in an actual browser** — no browser-automation
tool is available in this environment (confirmed via `ToolSearch`); said so explicitly rather than
claiming full verification. Learned from last session's `next build`-vs-`next dev` `.next` cache
collision (see [SETUP.md](SETUP.md#known-environment-specific-issues-this-machine)) and used
`tsc --noEmit` directly this time instead, so the live dev server was never disturbed.

**Next steps:** none identified — if a future session wants a browser-verified pass on this page
(or on the Permission & Approval page from last session), that would need either a
browser-automation tool added to this environment or a manual walkthrough by a human.

---

## 2026-08-11 (session 8) — Admin Recognition/Mentor/Fund approval ("Permission & Approval" section)

**Task:** when an Admin opens a single innovation for evaluation, show a "Permission & Approval"
section at the bottom letting them approve Recognition/Mentor/Fund support (in that order),
dynamically shown only for whichever the innovator actually requested, each with its own
checkbox + comments textarea, plus one shared approval-letter upload covering all three.

**Discovery:** no admin single-innovation page existed to hang this off of. The admin's
`/dashboard/admin/evaluations` page was list-only — its rows linked out to the public
`/repository/[slug]` detail page, which is unauthenticated and has no write actions. Built a new
admin-only detail page rather than repurposing the public one.

**Backend (`apps/api`):**
- `Innovation` model: added `recognitionApproved`/`recognitionApprovalComment`,
  `mentorApproved`/`mentorApprovalComment`, `fundApproved`/`fundApprovalComment` (booleans default
  `false`, comments nullable), and one shared `approvalLetterUrl` (nullable) — migration
  `20260811100354_add_admin_approval_fields`. Had to stop the running API process again before
  `prisma migrate dev`/`generate` would release the Windows query-engine DLL lock (same issue as
  the 2026-08-10 session), then rebuilt (`tsc`) and restarted it.
- New `UpdateApprovalDto` (`innovations/dto/update-approval.dto.ts`), all 7 fields optional.
- New `PATCH /innovations/:id/approval` on `InnovationsController`, guarded
  `@Roles(PLATFORM_ADMIN, SYSTEM_ADMIN)` + `RolesGuard` — deliberately a separate endpoint from
  the general-purpose `PATCH /innovations/:id` (which has no role guard at all and is also used by
  submitters editing their own drafts) so a non-admin owner can never set their own approval
  fields. `InnovationsService.updateApproval` does a plain partial update + `AuditLogService`
  entry (`INNOVATION_APPROVAL_UPDATED`). Not gated on the sibling `*Needed` flags server-side —
  the UI is what decides which fields are shown/submitted; the endpoint stays permissive so a
  decision already on file survives if the submitter later edits their request flags.
- See [API.md](API.md#api-changes) and [DATABASE.md](DATABASE.md#component-1--innovation-submission--evaluation).

**Frontend (`apps/web`):**
- New route `dashboard/admin/evaluations/[innovationId]/page.tsx` — modeled closely on the Expert
  Evaluator's own `dashboard/evaluations/[innovationId]/page.tsx` (same header/two-column layout,
  submitter profile card, innovation details, "Support requested" badges, review-comment
  timeline), but read-only for the innovation content itself (admins don't score) plus a new
  "Expert evaluations" sidebar card (existing evaluator scores/recommendations + any IP advisory
  flags for this innovation, via the already-admin-accessible `GET /evaluations/by-innovation/:id`
  and `GET /evaluations/ip-flags`) and, at the very bottom, the new `ApprovalSection`:
  Recognition → Mentor → Fund checkboxes (each rendered only if its `*Needed` flag is true) with a
  comments textarea per shown item, one "Save approval decisions" button that PATCHes only the
  shown fields, and a single approval-letter upload/view/replace control below all three (reuses
  the existing `useUploadFile()` → `POST /uploads` → store-URL pattern from the profile-avatar
  uploader; uploading immediately PATCHes `approvalLetterUrl` independent of the checkbox save).
- New `useUpdateInnovationApproval(innovationId)` hook in `use-innovations.ts`
  (`PATCH /innovations/:id/approval`, invalidates the `['innovation', id]` query).
- `dashboard/admin/evaluations/page.tsx`: both innovation links (shortlisted list + "Other IP
  flags" list) now point at the new `/dashboard/admin/evaluations/:id` detail page instead of the
  public `/repository/:slug` page.
- See [ROLES.md](ROLES.md) — `PLATFORM_ADMIN`/`SYSTEM_ADMIN` rows updated with the new route and
  guard.

**Verification:** tested the new endpoint directly against the live DB as `admin@nir.gov.bd`
against a real seeded innovation with all three `*Needed` flags true ("Smart AgriSense…") —
PATCHed all three approvals + a comment + a letter URL, confirmed the response and a matching
`AuditLog` row, confirmed a non-admin (`evaluator@nir.gov.bd`) gets 403 on the same endpoint, then
reverted the test mutation back to its original all-`false`/`null` state. Frontend: `next build`
compiled the new route with no errors; separately hit both the list and new detail page through
the running dev server (200s, clean compile in the dev log). Note: running `next build` in the
same directory as the already-running `next dev` clobbered its `.next` cache (`MODULE_NOT_FOUND`
on unrelated routes) — had to stop the dev server, delete `.next`, and restart it. Not a code bug,
just a gotcha of building and dev-serving from the same directory simultaneously — worth avoiding
next time (build in a way that doesn't touch the live dev server's `.next`, or just skip `next
build` and rely on the dev server's own on-demand compile + `tsc` for type-checking).

**Next steps:** none identified — feature is complete end-to-end. If a future session wants to go
further, worth considering whether an admin should be able to *revoke* an approval after the fact
(currently just re-check/re-save), and whether the approval letter should be deletable independent
of "replace" (currently upload always overwrites, matching the existing avatar-upload precedent).

---

## 2026-08-10 (session 7) — ran the app locally; Innovation Submission form and detail pages made feature-complete

**Tasks completed:**
- Ran the platform locally per `docs/SETUP.md`: API built once with `tsc` and started via
  `node dist/main.js` (the `nest start --watch` workaround, since watch mode is broken on this
  machine), web app via `next dev`. Confirmed both up (`/api/docs` → 200, `http://localhost:3000`
  → 200).
- Added a third "Recognition needed" checkbox to the Innovation Submission form, alongside the
  existing "Mentorship needed" / "Funding needed" checkboxes, same layout and styling. Full-stack
  change, mirroring how `mentorshipNeeded`/`fundingNeeded` are already wired end to end:
  - `Innovation.recognitionNeeded` (`Boolean @default(false)`) added to `prisma/schema.prisma`;
    migration `20260810093247_add_recognition_needed_flag` created and applied.
  - `CreateInnovationDto.recognitionNeeded` added (`UpdateInnovationDto` inherits it automatically
    via `PartialType`).
  - `apps/web/.../submit/page.tsx`: added to form state and the checkbox row (widened from
    2-col to 3-col grid to fit all three); included in submit payload automatically since the
    payload spreads the full form state.
  - `apps/web/.../dashboard/evaluations/[innovationId]/page.tsx`: added a "Recognition" row next
    to the existing "Mentorship"/"Funding" rows under "Support requested", using the same
    `RequestBadge` component — this is the other place in the app those two flags are surfaced,
    so the new one was added there too per the user's "show this input where necessary" ask.
  - Had to stop the running API process before `npx prisma generate` would succeed (it held a
    lock on the Windows query-engine DLL), then rebuilt and restarted it.
- Reordered the three checkboxes on the submit form to Recognition → Mentorship → Funding per user
  request (styling/layout untouched, pure JSX reorder).
- Added a required **Terms & Conditions** checkbox to the submit form, visually distinct from the
  three boxed support-request checkboxes (plain inline row, bolder checkbox border, underlined
  link-styled label text). "Save draft & continue" is now
  `disabled={createInnovation.isPending || !termsAccepted}`. Kept as page-local `useState`, not a
  `form` field — acceptance isn't part of the `Innovation` model, so it's deliberately never sent
  in the create payload.
- **Fixed a bug** the user spotted in a screenshot of the "Innovation team" add-member UI: after
  clicking "Add", the Role input showed literal dark text `"Team Member"` instead of a placeholder,
  and never cleared. Root cause: `memberRole` state defaulted to the literal string `'Team Member'`
  and was bound as the input's real `value`; it was also never reset after a successful add (unlike
  `memberName`, which was). Fixed in `dashboard/innovations/[id]/page.tsx`: `memberRole` now starts
  `''`, `"Team Member"` is a real `placeholder`, both fields reset after "Add", and the default role
  is applied at submit time (`memberRole || 'Team Member'`) if left blank.
- **Innovator's own "Manage Innovation" page** (`dashboard/innovations/[id]/page.tsx`) only showed
  title/summary/attachments/team — every other submitted field was invisible after submission. User
  asked for the innovator to be able to view everything they submitted. Brought over the same
  read-only display pattern already used on the evaluator's innovation-detail page
  (`dashboard/evaluations/[innovationId]/page.tsx`): problem statement, proposed solution,
  objectives, key features, target beneficiaries, impact in the main column; category, type, stage,
  TRL, IP status, funding source, region, organization, and the three support-requested badges in a
  sidebar. Editable Attachments/Team sections and the "Submit for review" flow left untouched below
  it.
- **Public repository detail page** (`components/repository/innovation-detail.tsx`,
  `/repository/[slug]`): user asked to surface Primary Reviewer / Authenticity Reviewer / Expert
  Evaluator feedback on this page. Since the page is fully public and unauthenticated, and the
  underlying data (`GET /innovations/:id/review-comments`, `GET /evaluations/by-innovation/:id`) is
  otherwise locked to internal roles, asked the user who should see it before implementing — user
  chose "not public, only the admin, when the innovation has been evaluated." Implemented as a new
  `AdminFeedbackPanel` child component that only fetches and renders when the viewer holds
  `Role.PLATFORM_ADMIN` (the one role already authorized for *both* underlying endpoints — chosen
  over also including `SYSTEM_ADMIN`, which is authorized for review-comments but not for
  evaluations-by-innovation, to avoid a partial-403 case) and only shows content once the innovation
  actually has review comments or evaluations. Reuses the existing `ReviewCommentTimeline` component
  for the two reviewer stages; added new inline UI for evaluator scores/comments/recommendation. No
  backend/access-control changes — this reuses the API's existing guards as-is.

**Files modified:**
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260810093247_add_recognition_needed_flag/`
- `apps/api/src/innovations/dto/create-innovation.dto.ts`
- `apps/web/src/app/[locale]/submit/page.tsx`
- `apps/web/src/app/[locale]/dashboard/evaluations/[innovationId]/page.tsx`
- `apps/web/src/app/[locale]/dashboard/innovations/[id]/page.tsx`
- `apps/web/src/components/repository/innovation-detail.tsx`
- `docs/DATABASE.md`, `docs/API.md`, `docs/UI_GUIDELINES.md`, `docs/ROADMAP.md`, `docs/SESSION_LOG.md` (this entry)

**Decisions made:**
- Chose `Role.PLATFORM_ADMIN` (not `SYSTEM_ADMIN`) as the sole gate for the repository page's
  admin feedback panel, since it's the only role with API access to both underlying endpoints — see
  above.
- Terms & Conditions acceptance is UI-only state, not persisted anywhere — no backend field was
  added for it.
- Backfilled `docs/DATABASE.md` and `docs/API.md` for the "support requested" flags
  (`mentorshipNeeded`/`fundingNeeded`/`recognitionNeeded`) as a group while documenting
  `recognitionNeeded`, superseding session 7's earlier note that said this was out of scope.

**Bugs fixed:**
- "Innovation team" Role input showing literal default text instead of a placeholder, and not
  resetting after "Add" (see above).

**Next steps for next session:**
- Both dev servers (API on :4000, web on :3000) were left running in the background at the end of
  this session.
- If a Platform Admin demo login is available, spot-check the new repository-page feedback panel
  live against a shortlisted/evaluated seeded innovation (not yet verified with a real authenticated
  admin session — only verified via `tsc --noEmit` and an unauthenticated smoke request confirming
  the panel correctly stays hidden).

**Bugs fixed:** none.

**Next steps for next session:**
- If `docs/DATABASE.md` / `docs/API.md` are ever brought up to full field-level detail, include
  `mentorshipNeeded`, `fundingNeeded`, and `recognitionNeeded` together on the `Innovation` model.
- Both dev servers (API on :4000, web on :3000) were left running in the background at the end of
  this session.

---

## 2026-08-09 (session 6) — pgAdmin 4 launch troubleshooting (unresolved)

**Tasks completed:**
- User asked to open pgAdmin 4 against the local DB. Located the install
  (`C:\Users\a2i\AppData\Local\Programs\pgAdmin 4\runtime\pgAdmin4.exe`, plus a Start Menu
  shortcut) and attempted to launch it several ways (`Start-Process`, direct invocation, with and
  without CLI flags). Every attempt exited cleanly (code 0) in under a second with no window, no
  output, and nothing logged anywhere (its own `pgadmin4.log`, Windows Event Log, Defender
  detections/ASR rules all checked and came up empty). Confirmed the launching shell had normal
  interactive-desktop access (correct, active console session) and that the binary itself is
  intact (`--help` returns valid Node.js CLI output, confirming it's an NW.js-packaged app that
  simply isn't reaching its own window-creation step). Root cause left undiagnosed — most likely a
  launch-context-sensitive block (e.g. security software behaving differently for a
  script-spawned launch vs. a direct user double-click) rather than a broken install.
- Documented this as a new machine-specific gotcha in `docs/SETUP.md` (workaround: launch via
  Start Menu shortcut by hand instead of automation; use `psql`/Prisma Studio for ad hoc queries
  in the meantime, both confirmed working on this machine).

**Files modified:**
- `docs/SETUP.md` (new known-issue entry under "Known environment-specific issues")
- `docs/SESSION_LOG.md` (this entry)

**Decisions made:**
- Stopped active troubleshooting once the standard diagnostic surfaces (process exit code, own
  log file, Windows Event Log, Defender) were all exhausted and came up empty, rather than
  continuing to guess — asked the user to try a direct double-click instead, since that's a
  meaningfully different launch path that could resolve it without further investigation here.

**Bugs fixed:** none — this is a local desktop-environment issue, not an application/codebase
defect; nothing in `apps/` was touched.

**Next steps for next session:**
- If the user reports pgAdmin still won't open even via direct double-click, worth checking
  third-party endpoint security / antivirus software specifically (Defender itself was ruled out)
  for anything quarantining or blocking `pgAdmin4.exe`.
- If pgAdmin turns out to be unnecessary (i.e. `psql`/Prisma Studio cover what's needed), this
  item can be closed without further investigation — check with the user.

---

## 2026-08-09 (session 5) — E2E test: Innovation Submission → Platform Administration Shortlist

**Tasks completed:**
- User requested a formal end-to-end test case covering the full pipeline from Innovation
  Submission through to the Platform Administrator's Shortlist view. Asked which deliverable they
  wanted (written spec only, live execution only, or both); user chose both.
- Traced what "Platform Administration Shortlist" actually refers to before writing the test:
  `GET /evaluations/shortlisted` / `/dashboard/admin/evaluations`'s "Shortlisted by evaluators"
  panel — which queries the `Evaluation` model for `recommendation: SHORTLIST`, **not**
  `Innovation.reviewStatus`. This means the real pipeline is longer than reviewStatus alone: an
  Expert Evaluator must be assigned a panel and submit an evaluation with a Shortlist
  recommendation after Authenticity Review shortlists the innovation — a step not exercised by any
  earlier session's testing.
- Designed and executed a 13-step test case (`E2E-SUB-SHORTLIST-01`) against the live app via
  direct authenticated REST calls (the same endpoints/guards each dashboard page's UI calls),
  covering six actors in sequence: Innovation Submitter (create + submit) → Preliminary Reviewer
  (screen + forward) → Authenticity Reviewer (verify + shortlist) → Institutional Coordinator
  (assign evaluator panel) → Expert Evaluator (score + Shortlist recommendation) → Platform Admin
  (confirm it appears in the Shortlisted view, correctly grouped by month with evaluator name and
  IP-flag status). Created a brand-new innovation (`NIR-2026-000029`, "E2E Test — Drought-Resilient
  Rice Seed Advisory App") rather than reusing prior sessions' seeded test data, so submission
  itself was genuinely exercised too.
- All 13 steps passed, including a final data-integrity check confirming the original submission
  fields and both reviewers' `ReviewComment` history survived the full six-actor, six-transition
  chain intact.
- Caught and correctly diagnosed a false alarm: the initial title's em dash was rendered as a
  replacement character (U+FFFD) in the stored data. Root-caused it to Git Bash's command-line
  argument encoding mangling the character before it reached the API on this Windows environment
  — not a platform defect. Confirmed by resubmitting the same field via a properly UTF-8-encoded
  file payload (`PATCH /innovations/:id`), which persisted the em dash correctly on the first try.
  No code changes were needed; this is purely a note about the test methodology, not a fix.
- This run also served as regression coverage for the three fixes from sessions 1–4 (Preliminary
  Reviewer's Shortlist transition, Rejected-tab cross-stage leakage, Authenticity Reviewed-tab
  per-reviewer scoping) — all behaved correctly under a real, previously-untested full pipeline.
- Published the test report as an Artifact (test case + step-by-step expected/actual results +
  notes) rather than only reporting in chat, since it's a reusable, shareable QA document.

**Files modified:** none — this was a verification-only session, no application code changed.

**Decisions made:**
- Left `NIR-2026-000029` in the system at `SHORTLISTED` as a permanent, fully-worked demo record
  rather than reverting it — unlike prior sessions' test mutations (which modified *existing*
  seeded records and were reverted to avoid corrupting known demo state), this innovation was
  created fresh through the genuine self-service flow, so keeping it doesn't misrepresent any
  pre-existing data. It now doubles as a reference example of a submission that made it all the
  way through the pipeline.
- Chose to execute via direct REST calls (per-role authenticated requests) rather than browser
  automation — no browser-driving tool was available in this session, and every request exercises
  the identical endpoint, guard, and RBAC path each dashboard page's button click would trigger.
  Noted this explicitly in the report's methodology so it isn't mistaken for a claim of literal
  UI-click testing.

**Bugs fixed:** none — no defects found; all 13 steps passed on the first attempt (the em-dash
issue was test-tooling, not the product, as detailed above).

**Next steps for next session:**
- Nothing currently in progress — check with the user for the next priority.
- If a "test cases" doc ever becomes a recurring need, consider adding a `docs/TESTING.md` to this
  project's persistent doc set (currently there isn't one — this run's spec+results live only in
  the published Artifact and this log entry).

---

## 2026-08-09 (session 4) — Scoped Authenticity Reviewer's "Reviewed" tab per-reviewer

**Tasks completed:**
- User asked that the Authenticity Review page's "Reviewed" tab only show reviews made by that
  specific user. Investigated: `findAuthenticityReviewQueue`'s `REVIEWED` branch (added session 2)
  filtered purely by category, with no notion of *which* Authenticity Reviewer did the shortlisting
  — since a `Category` can have multiple reviewers assigned, this meant one reviewer's "Reviewed"
  tab could show another reviewer's work. Confirmed this live: `authenticity@nir.gov.bd` and
  `authenticity-test@nir.gov.bd` (a pre-existing test account, still active in the DB) share
  categories, and before the fix each saw both accounts' shortlisted innovations mixed together.
- Added `Innovation.authenticityReviewedById` (nullable, no formal `@relation` — matches
  `submittedById`'s existing plain-id pattern on this model rather than growing `User`'s
  back-relation list) via migration `20260809043821_add_innovation_authenticity_reviewed_by`. Set
  in `InnovationsService.updateStatus` specifically on the `AUTHENTICITY_REVIEW → SHORTLISTED`
  transition (attributed to the acting user regardless of role, so a senior override is still
  credited correctly), and deliberately left untouched on every later transition (`SELECTED`,
  `PUBLISHED`, `ARCHIVED`) so the field keeps pointing at the original reviewer even after the
  innovation moves on to stages owned by other roles.
- Updated `findAuthenticityReviewQueue`: the `REVIEWED` branch now adds
  `authenticityReviewedById: viewer.id` to the query for non-admins. Admins keep seeing everything,
  unchanged — same bypass pattern already used for the category and `rejectedAtStage` filters.
- Backfilled existing data: found 13 innovations already sitting at `SHORTLISTED`/`SELECTED`/
  `PUBLISHED` with no `authenticityReviewedById` (field didn't exist before this migration). For
  each, looked up its genuine `SHORTLISTED`-transition `AuditLog` entry (not just the most recent
  log — some had since moved on to `SELECTED`/`PUBLISHED`) and set `authenticityReviewedById` from
  the actor on that entry. 6 had a real audit trail (from `admin@nir.gov.bd`,
  `authenticity-test@nir.gov.bd` ×3, `prelim-test@nir.gov.bd`, and `authenticity@nir.gov.bd`) and
  were backfilled accordingly; the other 7 had no `INNOVATION_STATUS_CHANGED` log at all (seeded
  directly at `SHORTLISTED`/`PUBLISHED` to bootstrap Evaluator-stage demo data, never actually
  processed by a reviewer) — left `null` rather than falsely attributed to today's demo account.
- Verified end-to-end against the live DB from three different logins, no synthetic test mutation
  needed since real existing data was sufficient: `authenticity@nir.gov.bd`'s Reviewed tab now
  shows exactly 1 item (their own "SmartAgri IoT" shortlist); `authenticity-test@nir.gov.bd`'s
  shows exactly 3 (their own, different items) with zero overlap; `admin@nir.gov.bd` still sees all
  13 (bypass intact).

**Files modified:**
- `apps/api/prisma/schema.prisma` (`Innovation.authenticityReviewedById` field)
- `apps/api/prisma/migrations/20260809043821_add_innovation_authenticity_reviewed_by/` (new)
- `apps/api/src/innovations/innovations.service.ts` (`updateStatus`: computes/preserves
  `authenticityReviewedById`; `findAuthenticityReviewQueue`: person-scoped `REVIEWED` filter)
- `docs/DATABASE.md`, `docs/API.md`, `docs/ROADMAP.md` (this sync)

**Decisions made:**
- Chose a plain id field over a formal Prisma relation, matching `submittedById`'s existing
  precedent on the same model — the codebase deliberately keeps `User`'s back-relation list from
  growing with every FK that merely references it for filtering/audit purposes.
- For the 7 seeded-directly innovations with no genuine reviewer action, chose `null` over
  attributing them to whichever demo account happened to be testing this feature — `null` is
  honest about "nobody actually authenticity-reviewed this," and it only affects visibility in a
  specific reviewer's personal "Reviewed" tab (admins still see it via their bypass).
- Logged (didn't fix) the identical latent gap in Preliminary Review's own "Reviewed" tab — not
  currently reproducible since only one active `preliminary@nir.gov.bd` account exists, and not
  part of what was asked this session. See `ROADMAP.md § Known issues`.

**Bugs fixed:**
- Authenticity Reviewer's "Reviewed" tab leaking other reviewers' shortlists in shared categories
  (see above) — the session's only task, reported directly by the user.

**Next steps for next session:**
- If a second Preliminary Reviewer account is ever added sharing categories with
  `preliminary@nir.gov.bd`, the identical `authenticityReviewedById`-style fix will be needed for
  `findPreliminaryReviewQueue`'s `REVIEWED` branch too (see `ROADMAP.md § Known issues`).
- Nothing currently in progress — check with the user for the next priority.

---

## 2026-08-09 (session 3) — Fixed Rejected-tab cross-stage leakage

**Tasks completed:**
- User asked why the Authenticity Reviewer was seeing "Test Innovation" in their Rejected tab.
  Traced it via the audit log (`AuditLog` entries for that innovation, ordered chronologically):
  it had been rejected directly by `preliminary@nir.gov.bd` from `UNDER_REVIEW` (a real Reject
  click on the Preliminary Review page, after the session-1 test mutation had been reverted back
  to `UNDER_REVIEW`) — the Authenticity Reviewer never touched it. Root cause: both
  `findPreliminaryReviewQueue` and `findAuthenticityReviewQueue`'s `REJECTED` filter was just
  `reviewStatus: REJECTED` + category match, with no notion of *which stage* rejected it — so any
  `REJECTED` innovation in a reviewer's assigned categories appeared in **both** dashboards'
  Rejected tabs, regardless of which one actually rejected it. Confirmed with the user this should
  be fixed (each reviewer's Rejected tab scoped to their own stage) rather than left as-is.
- Added `Innovation.rejectedAtStage` (nullable `ReviewStage`) via migration
  `20260809043001_add_innovation_rejected_at_stage`. Set in `InnovationsService.updateStatus` on
  every transition: to `PRELIMINARY_REVIEW` when rejected from `UNDER_REVIEW`, to
  `AUTHENTICITY_REVIEW` when rejected from `AUTHENTICITY_REVIEW`, to `null` for a rejection from
  any other status (e.g. a coordinator rejecting from `SHORTLISTED` — belongs to neither reviewer
  queue) or on any transition away from `REJECTED` (including resubmission via `submit()`).
  Deliberately derived from the innovation's prior status rather than the acting user's role, so a
  senior override (admin/coordinator/manager rejecting on a reviewer's behalf) still attributes to
  the correct stage.
- Updated both `findPreliminaryReviewQueue` and `findAuthenticityReviewQueue`: when
  `reviewStatus=REJECTED` is requested, non-admin callers now also filter on `rejectedAtStage`
  matching their own stage. Admins keep seeing every `REJECTED` innovation in scope, unchanged —
  same bypass pattern already used for the category filter.
- Backfilled the one pre-existing `REJECTED` innovation (the "Test Innovation" from the bug report)
  by reading its last `INNOVATION_STATUS_CHANGED` audit-log entry and deriving `rejectedAtStage`
  from that entry's `from` field, since the migration itself can't infer historical stage data.
- Verified both directions end-to-end against the live DB: (1) confirmed "Test Innovation" now
  disappears from Authenticity's Rejected tab (count 0) while remaining in Preliminary's; (2) as a
  forward-looking check, rejected a different real innovation directly from `AUTHENTICITY_REVIEW`
  and confirmed the reverse — present in Authenticity's Rejected tab, absent from Preliminary's;
  (3) confirmed `rejectedAtStage` auto-clears to `null` on the revert transition back out of
  `REJECTED`. Reverted both test mutations afterward (status, `reviewRemarks`, and the test
  `ReviewComment` rows) to leave demo data as found.

**Files modified:**
- `apps/api/prisma/schema.prisma` (`Innovation.rejectedAtStage` field)
- `apps/api/prisma/migrations/20260809043001_add_innovation_rejected_at_stage/` (new)
- `apps/api/src/innovations/innovations.service.ts` (`updateStatus`: computes/clears
  `rejectedAtStage`; `submit`: clears it on resubmission; both queue methods: stage-scoped
  `REJECTED` filter for non-admins)
- `docs/DATABASE.md`, `docs/API.md`, `docs/ROADMAP.md` (this sync)

**Decisions made:**
- Asked the user explicitly whether cross-stage Rejected visibility was intended before changing
  it, since it affects existing (if accidental) behavior on two pages — confirmed "scope to own
  stage" was the desired fix, not "leave as-is."
- Chose a stored column over deriving the rejecting stage on-the-fly from `AuditLog`/`ReviewComment`
  at query time: `AuditLog` entries always exist (reliable) but querying "latest transition per
  innovation" for a whole result set isn't a single clean Prisma query without raw SQL, and
  `ReviewComment` isn't reliable since a comment is only written when a non-senior reviewer
  supplies a note — many rejections (especially senior-role or note-less ones) wouldn't have one.
  A stored, always-recomputed field keeps the queue queries simple single-`findMany` calls.
- Admins keep the un-scoped (see-everything) view for `REJECTED`, matching how they already bypass
  the category filter — they're meant to have full oversight across every stage.

**Bugs fixed:**
- Cross-stage Rejected-tab leakage (see above) — the session's only task, reported directly by the
  user after testing the previous two sessions' work.

**Next steps for next session:**
- Nothing currently in progress — check with the user for the next priority.

---

## 2026-08-09 (session 2) — Brought Authenticity Review up to the same standard

**Tasks completed:**
- Extended the previous session's Preliminary Review fix (below) to `/dashboard/authenticity-
  review`, per an explicit follow-up request to mirror the same workflow for the Authenticity
  Reviewer. Unlike Preliminary Review, the Authenticity Reviewer's Shortlist button
  (`AUTHENTICITY_REVIEW → SHORTLISTED`) was **already valid** against
  `InnovationsService.updateStatus`'s role guard — no transition bug existed there. Two real gaps
  did exist:
  1. **"Authenticator Notes" field wasn't starting empty.** `AuthenticityReviewRow` initialized its
     textarea from `innovation.reviewRemarks`, but by the time an innovation reaches Authenticity
     Review that field already holds the *Preliminary* Reviewer's note (forwarded via the previous
     session's fix) — so the Authenticator's own notes field silently pre-filled with someone
     else's text. Fixed to always start `useState('')`, with a more specific placeholder guiding
     what to enter (authenticity/originality/duplication findings). The Preliminary Reviewer's
     note is still visible via the existing `ReviewCommentTimeline` above the field, so nothing was
     hidden — it just moved out of an editable input that looked like it belonged to the current
     reviewer.
  2. **No "Reviewed" tab existed** — shortlisted innovations just vanished from the Authenticator's
     view entirely (same gap Preliminary Review had). Added one, backed by the identical
     `reviewStatus=REVIEWED` pseudo-status pattern on `GET /innovations/authenticity-review-queue`
     (`InnovationsService.findAuthenticityReviewQueue`), resolving to `SHORTLISTED|SELECTED|
     PUBLISHED|ARCHIVED` — see [API.md](API.md#api-changes).
  - Also relabeled the readOnly "Remarks:" line to "Authenticator notes:" for clarity, matching the
    field's own label in edit mode.
- Verified end-to-end against the live DB using the **actual** `authenticity@nir.gov.bd` demo
  account (not an admin bypass): shortlisted a real seeded innovation
  (`NIR-2026-000022`/"Smart Pharmacy Inventory Network"), confirmed it (1) left the Pending queue,
  (2) appeared exactly once (no duplication) in the new Reviewed queue carrying its own notes,
  (3) became visible to an `EXPERT_EVALUATOR` viewer via `findOneForViewer`'s
  `evaluatorVisibleStatuses` check (confirms "forwarded to Expert Evaluator" per the request), and
  (4) left team/attachments/tags/`innovationCode` untouched. Then reverted the test transition and
  restored the original `reviewRemarks` text via a direct Prisma call (same pattern as last
  session — the status-update endpoint has no way to clear/reset a note once set).
- **Correction to the previous session's Known Issue:** while logging in as `authenticity@nir.gov.bd`
  this session, found its `authenticityReviewerCategoryIds` is now populated (matches
  `preliminary@nir.gov.bd`'s two categories) — someone (presumably the user, via the admin Users
  tab) assigned it between sessions. Removed the now-resolved entry from
  `ROADMAP.md § Known issues`.

**Files modified:**
- `apps/api/src/innovations/innovations.service.ts` (`findAuthenticityReviewQueue`: added the
  `REVIEWED` pseudo-status branch, mirroring `findPreliminaryReviewQueue`)
- `apps/web/src/app/[locale]/dashboard/authenticity-review/page.tsx` (notes field starts empty
  with a specific placeholder, added the "Reviewed" tab + empty-state copy, relabeled the readOnly
  remarks line)
- `docs/API.md`, `docs/ROADMAP.md` (this sync)

**Decisions made:**
- Did not touch the Shortlist/Reject button targets on this page — they were already correct
  (unlike Preliminary Review's bug last session). Confirmed via a live API call before assuming so.
- Kept `ReviewCommentTimeline` scoped to `stages={['PRELIMINARY_REVIEW']}` only (didn't add
  `AUTHENTICITY_REVIEW` to it) — the Authenticator's own note is already shown via the readOnly
  "Authenticator notes:" line once submitted, so adding it to the timeline too would just show the
  same text twice on the same row.

**Bugs fixed:**
- Authenticator Notes field pre-filling with the Preliminary Reviewer's note instead of starting
  empty (see above) — this was the session's main defect found; the Shortlist transition itself
  had no bug.

**Next steps for next session:**
- Nothing currently in progress — check with the user for the next priority. If further
  Reviewer-stage parity work comes up, the same `REVIEWED` pseudo-status pattern is now
  established in two places (`findPreliminaryReviewQueue`, `findAuthenticityReviewQueue`) and could
  be generalized if a third queue needs it.

---

## 2026-08-09 — Ran the app; fixed broken "Shortlist" button on Preliminary Review

**Tasks completed:**
- Ran the full stack per `docs/SETUP.md` (no project-run-skill existed yet, so used the `run`
  skill's generic server pattern): rebuilt `apps/api` and ran `node dist/main.js` (port 4000),
  `npm run dev` for `apps/web` (port 3000). Verified both with live requests (`/reporting/public-
  stats`, homepage HTML). No env/setup drift found — `docs/SETUP.md` is still accurate.
- Investigated and fixed a reported bug: clicking **Shortlist** as a Preliminary Reviewer on
  `/dashboard/preliminary-review` did nothing visible (and would 403 server-side). Root cause:
  `PreliminaryReviewRow`'s Shortlist button sent `reviewStatus: 'SHORTLISTED'`, but
  `InnovationsService.updateStatus`'s role guard only ever permitted Preliminary Reviewers to move
  `UNDER_REVIEW → AUTHENTICITY_REVIEW` or `REJECTED` — `SHORTLISTED` is the *Authenticity*
  Reviewer's own action one stage later in the pipeline (`DRAFT → UNDER_REVIEW →
  AUTHENTICITY_REVIEW → SHORTLISTED → SELECTED/REJECTED → PUBLISHED/ARCHIVED`, see
  [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules)). Fixed the button to send
  `AUTHENTICITY_REVIEW` instead — this both (a) correctly forwards the innovation into the
  Authenticity Reviewer's pending queue, and (b) removes it from the Preliminary Reviewer's own
  Pending queue, matching what was requested.
- Added a **"Reviewed"** tab to `/dashboard/preliminary-review` (previously only "Pending review"/
  "Rejected" existed), so forwarded innovations remain visible instead of disappearing entirely
  from the reviewer's view once shortlisted. Backed by a new `reviewStatus=REVIEWED` pseudo-status
  on `GET /innovations/preliminary-review-queue` (`InnovationsService.findPreliminaryReviewQueue`)
  that resolves to "any status past `UNDER_REVIEW`" (`AUTHENTICITY_REVIEW`, `SHORTLISTED`,
  `SELECTED`, `PUBLISHED`, `ARCHIVED`), still scoped by the reviewer's assigned categories — see
  [API.md](API.md#api-changes).
- Verified the full fix end-to-end against the live seeded DB (not just reading the code): logged
  in as `preliminary@nir.gov.bd`, forwarded a real seeded innovation
  (`NIR-2026-000005`/"Test Innovation"), and confirmed (1) it left the Preliminary "Pending" queue,
  (2) it appeared in the new "Reviewed" queue, (3) it appeared in the Authenticity Reviewer's
  queue (confirmed via `admin@nir.gov.bd`, which bypasses category routing — see the known-issue
  below on why the seeded `authenticity@nir.gov.bd` account itself saw nothing), (4) a
  `ReviewComment` (stage `PRELIMINARY_REVIEW`) was recorded, and (5) team members/attachments/
  category/`innovationCode` were all untouched by the transition. Then reverted the test
  transition (`AUTHENTICITY_REVIEW → REJECTED → UNDER_REVIEW` via admin, plus a direct Prisma
  call to null out the test `reviewRemarks` and delete the test `ReviewComment` row, since the
  status-update endpoint has no way to clear a note once set) to leave demo data exactly as found.
- While verifying, discovered the seeded `authenticity@nir.gov.bd` account has an empty
  `authenticityReviewerCategoryIds` array (unlike the evaluator/preliminary-reviewer demo
  accounts, which do have categories seeded) — logged as a new Known Issue in `ROADMAP.md` rather
  than fixed, since it's a one-line seed change outside this session's scope.

**Files modified:**
- `apps/api/src/innovations/innovations.service.ts` (`findPreliminaryReviewQueue`: added the
  `REVIEWED` pseudo-status branch)
- `apps/web/src/app/[locale]/dashboard/preliminary-review/page.tsx` (Shortlist button now sends
  `AUTHENTICITY_REVIEW`; added the "Reviewed" tab and its empty-state copy)
- `docs/API.md`, `docs/ROADMAP.md` (this sync)

**Decisions made:**
- Kept the button's visible label as "Shortlist" (per the user's own framing of the bug report)
  even though it now sends `reviewStatus: AUTHENTICITY_REVIEW`, not `SHORTLISTED` — the page's own
  subhead already describes this as "Shortlisted innovations move on to Authenticity review", so
  "Shortlist" was always meant as the UX verb for this forwarding action, not a literal reference
  to the `SHORTLISTED` enum value. Didn't rename it to avoid a confusing mismatch with the
  existing subhead copy.
- `REVIEWED` is a frontend/service-layer convention, not a real `ReviewStatus` enum value — chose
  this over adding a real enum value (or a separate boolean flag) since it's purely a query-side
  grouping of existing statuses with no new state to persist.

**Bugs fixed:**
- Preliminary Reviewer's Shortlist button (see above) — this was the session's main task.

**Next steps for next session:**
- Consider seeding `authenticityReviewerCategoryIds` for `authenticity@nir.gov.bd` (see new Known
  Issue in `ROADMAP.md`) so that demo account's queue isn't empty by default.
- Nothing else currently in progress — check with the user for the next priority.

---

## 2026-08-04 (session 2) — Admin dashboard reorg, demo data, role-based sign-up

**Tasks completed:**
- Removed "Moderation" from the Platform Admin sidebar (kept for Institutional Coordinator only)
  — nav-only change, backend guard on moderation-queue endpoints still permits `PLATFORM_ADMIN`.
- Removed the admin-editable Designation/Institution text inputs from the Users tab
  (`EvaluatorDetails` in `dashboard/admin/page.tsx`) — those fields are now self-service only,
  via the user's own `/dashboard/profile` page (which already had them wired to `PATCH /users/me`).
- Moved the "Evaluations" tab out of `/dashboard/admin` into its own `/dashboard/admin/evaluations`
  page; merged the previously separate "Shortlisted by evaluators" / "Flagged for IP review"
  panels into one list where each shortlisted item shows an inline IP-flag status pill; then
  grouped that list by month (`submittedAt`).
- Renamed "Approvals" to "User Approvals" in the sidebar.
- Expanded seed data (`apps/api/prisma/seed.ts`) in three passes: (1) 3 more Expert Evaluators +
  4 more lightweight innovations + 15 shortlisted evaluations across May–Aug 2026 + 3 IP flags,
  so the new month-grouped Evaluations page has something to show; (2) 11 pending registrations
  (`pending1`–`pending11@nir.gov.bd`) spanning nearly every role, so User Approvals has a
  realistic queue; (3) three new **active** demo accounts — `preliminary@nir.gov.bd`,
  `authenticity@nir.gov.bd`, `stakeholder@nir.gov.bd` — since Preliminary Reviewer, Authenticity
  Reviewer, and Stakeholder/Partner previously had no working seeded login.
- Added role-based dynamic fields to the sign-up form (`/register`): Investor gets BIN number +
  sector-interest chips, Mentor gets bio + availability + expertise-tag chips, Ministry Focal
  Point gets a designation field. Extended `RegisterDto` and `AuthService.register` to forward
  these to `FundingService.registerInvestor` / `MentorshipService.registerMentor` /
  `MinistriesService.registerFocalPoint`, which already accepted them via their own authenticated
  `/register` endpoints — registration just hadn't exposed that capability publicly before.
  Verified end-to-end against the live DB (registered + inspected + deleted two throwaway test
  accounts) rather than trusting the UI alone.
- Replaced the sign-in page's stale one-line demo-accounts note with a full scrollable list of
  all 17 seeded accounts (role label via shared `ROLE_LABELS` + email), driven by a `DEMO_ACCOUNTS`
  constant in the page component.
- Synced this documentation set (`docs/PROJECT_CONTEXT.md`, `API.md`, `ROLES.md`,
  `UI_GUIDELINES.md`, `ROADMAP.md`) to reflect all of the above.

**Files modified:**
- `apps/web/src/components/dashboard/dashboard-shell.tsx` (nav changes)
- `apps/web/src/app/[locale]/dashboard/admin/page.tsx` (Evaluations tab removed, Designation/
  Institution inputs removed)
- `apps/web/src/app/[locale]/dashboard/admin/evaluations/page.tsx` (new)
- `apps/api/prisma/seed.ts` (evaluators, innovations, shortlist history, IP flags, pending
  registrations, new active role accounts)
- `apps/api/src/auth/dto/register.dto.ts`, `apps/api/src/auth/auth.service.ts` (new optional
  registration fields)
- `apps/web/src/hooks/use-content.ts` (new `useTags` hook), `apps/web/src/hooks/use-auth.ts`
  (widened `useRegister` input type)
- `apps/web/src/app/[locale]/register/page.tsx` (role-based dynamic fields + `ChipSelect`)
- `apps/web/src/app/[locale]/sign-in/page.tsx` (full demo-accounts list)
- `apps/web/messages/en.json`, `apps/web/messages/bn.json` (new translation keys)
- `docs/PROJECT_CONTEXT.md`, `docs/API.md`, `docs/ROLES.md`, `docs/UI_GUIDELINES.md`,
  `docs/ROADMAP.md` (this sync)

**Decisions made:**
- Kept nav-level role gating (what shows in the sidebar) explicitly separate from API-level
  authorization (what the backend permits) rather than trying to keep them numerically identical
  — documented in `UI_GUIDELINES.md` and `ROLES.md` so this isn't mistaken for a security fix
  down the line.
- Left the Evaluator/Preliminary Reviewer/Authenticity Reviewer/Coordinator/Manager/Policy
  Observer roles in the demo *pending-registrations* list even though they aren't real
  self-service registration options — flagged clearly in code comments and in
  `PROJECT_CONTEXT.md` so it isn't mistaken for real product behavior later.
- Did not extract the two now-duplicated chip-multi-select implementations into a shared
  component — logged as tech debt in `ROADMAP.md` instead, since a third use case would justify
  it better than doing it speculatively now.

**Bugs fixed:** none — all additive feature/demo-data work; no defects were found or fixed this
session (the `saved-searches` ownership gap and other previously-logged issues remain open).

**Next steps for next session:**
- `docs/DATABASE.md` and `docs/SETUP.md` were reviewed and found still accurate — no schema or
  environment changes happened this session, so they weren't touched.
- If the sign-in `DEMO_ACCOUNTS` list or `PROJECT_CONTEXT.md`'s demo-accounts table ever drifts
  from `apps/api/prisma/seed.ts` again, that's the tech-debt item to finally resolve (see
  `ROADMAP.md § Technical debt`).
- Nothing is currently in progress — check with the user for the next priority.

---

## 2026-08-04

**Tasks completed:**
- Created the `docs/` directory and the full persistent-memory documentation set requested by
  the user: `PROJECT_CONTEXT.md`, `API.md`, `DATABASE.md`, `UI_GUIDELINES.md`, `ROADMAP.md`,
  `SESSION_LOG.md`, plus two additional files judged worth adding given this project's shape:
  `ROLES.md` (a 14-role permission matrix — the RBAC logic is split across the Prisma schema,
  ~20 NestJS controllers, and frontend nav gating, so a single cross-reference was worth having)
  and `SETUP.md` (local dev setup, including the machine-specific Postgres port and the
  `nest start --watch` build-cache workaround already known from prior sessions).
- Populated every file from a direct read of the actual codebase (not templates): `README.md`,
  `package.json`, `docker-compose.yml`, `.env.example`, `apps/api/prisma/schema.prisma` (full,
  47 models/23 enums), `apps/api/src/main.ts` + `app.module.ts`, `Documents/Technical Summary -
  NIR Platform.md`, `Documents/NIR Content.md` (vision/mission/objectives copy), the actual
  migration folder listing, plus two Explore-agent passes covering (a) every controller/endpoint
  in `apps/api/src/**` including auth-flow internals and custom decorators, and (b) the full
  `apps/web` route map, Tailwind design tokens, component inventory, state management, and
  i18n setup.
- Created a root `CLAUDE.md` that wires the `docs/` workflow rules (read at session start, keep
  updated during the session, log + update at session end) into Claude Code's own auto-loaded
  project instructions, so the rules the user specified are actually enforced automatically in
  future sessions rather than living only in this log entry.

**Files created:**
- `docs/PROJECT_CONTEXT.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/UI_GUIDELINES.md`,
  `docs/ROADMAP.md`, `docs/SESSION_LOG.md`, `docs/ROLES.md`, `docs/SETUP.md`, `CLAUDE.md` (repo
  root).

**Decisions made:**
- `docs/` is the maintained reference going forward; `Documents/Technical Summary - NIR
  Platform.md` (an earlier informal snapshot) is superseded by it — noted in
  `PROJECT_CONTEXT.md` rather than deleted, since it's the user's own file.
- Added `ROLES.md` and `SETUP.md` beyond the requested six files (see above) rather than folding
  their content into the closest existing file, since both cut across the other docs enough to
  warrant their own reference point.
- Documented several things-as-found rather than fixing them on the spot, since this session's
  scope was documentation, not remediation: the `saved-searches` delete-ownership gap, the
  `challenges/partners/news/resources` empty scaffold folders, the two coexisting color palettes,
  the unwired `darkMode` config. All logged in `ROADMAP.md` under Known Issues / Technical Debt.

**Bugs fixed:** none — this was a documentation-only session, no code was changed.

**Next steps for next session:**
- Read all of `docs/` before making any changes (per the workflow rules in `CLAUDE.md`).
- Nothing is currently in progress (`ROADMAP.md § Current work` is empty) — check with the user
  for the next priority.
- If picking up a Known Issue from `ROADMAP.md`, the saved-searches ownership check is the
  smallest/lowest-risk starting point.

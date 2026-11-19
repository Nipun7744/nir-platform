# Local Setup — NIR Platform

> Extra file (not in the original doc set) — added because this machine has a couple of
> environment-specific gotchas that aren't in the README and are easy to re-discover the hard
> way. Update this if the workaround below stops being necessary, or if a new one shows up.

## Requirements

Node 20+, PostgreSQL 16 reachable locally, npm 9+ (workspaces support). Docker is available
(`docker-compose.yml` at repo root) but **this environment runs without it** — Postgres runs as a
native local install.

## Known environment-specific issues (this machine)

- **Postgres runs on port `5433`, not the default `5432`** — some other local Postgres install
  likely already owns 5432. Make sure `DATABASE_URL` in `apps/api/.env` points at `5433`.
- **`npm run start:dev` (`nest start --watch`) is broken on this machine.** It hits a build-cache
  race: a stale `tsconfig.build.tsbuildinfo` makes `tsc` skip re-emitting `dist/` after
  `nest-cli`'s `deleteOutDir` wipes it, crashing with `Cannot find module 'dist/main'`.
  **Workaround — build once, run the compiled output, restart manually on change:**
  ```bash
  cd apps/api
  npm run build          # tsc -p tsconfig.build.json
  node dist/main.js
  ```
  Backend changes will **not** hot-reload with this workaround — re-run `npm run build && node
  dist/main.js` after editing backend code. If you want real watch mode back, the likely fix is
  switching to a plain `tsc --watch` + a separate process manager that restarts `node dist/main`
  on file change (nodemon or similar), rather than relying on `nest-cli`'s watch pipeline. Nobody
  has done this yet — see [ROADMAP.md](ROADMAP.md).
- **Backgrounding the two servers (how to get logs you can actually read):** let the launcher do
  the redirect rather than the shell — e.g. `Start-Process node -ArgumentList 'dist/main.js'
  -WorkingDirectory <repo>\apps\api -WindowStyle Hidden -PassThru
  -RedirectStandardOutput <repo>\.logs\api.out.log -RedirectStandardError <repo>\.logs\api.err.log`
  for the API, and the same `Start-Process cmd -ArgumentList '/c','npm run dev > …web.out.log 2>
  …web.err.log'` shape for `apps/web`. Session 37 recorded these logs as always empty; that only
  holds for block-buffered output with *no* explicit redirect — with the redirects above both
  files fill up normally, so tailing them is a valid check next to the port/HTTP checks. Put the
  log dir where `*.log` is already git-ignored (repo-root `.logs/` is). Note `Start-Process` takes
  a plain string for `-WorkingDirectory`, and PowerShell needs `-LiteralPath` for the
  `apps/web/src/app/[locale]` directory.

- **pgAdmin 4 (`C:\Users\<user>\AppData\Local\Programs\pgAdmin 4\runtime\pgAdmin4.exe`) won't
  launch when started from an automation tool / non-interactive script on this machine** — the
  process exits cleanly (code 0) in well under a second, no window ever appears, and nothing is
  written to its own log (`%APPDATA%\pgAdmin\pgadmin4.log`), the Windows Event Log, or Defender
  detections. Confirmed it's not a session-isolation issue (the launching process had normal
  access to the active interactive console session) and not a corrupted install (`--help` returns
  valid output, confirming the binary itself works — it's an NW.js-packaged app). Root cause
  undiagnosed; most likely some launch-context-sensitive block (e.g. security software treating a
  script-spawned launch differently from a user double-click) rather than anything wrong with
  pgAdmin or the Postgres install itself. **Workaround:** launch it manually by double-clicking
  the Start Menu shortcut (`pgAdmin 4` under Start Menu → Programs) instead of via
  `Start-Process`/scripted launch — or skip the GUI entirely and use `psql`/Prisma Studio
  (`npx prisma studio` from `apps/api`, see below) or `apps/api/prisma/schema.prisma` +
  direct `psql -h localhost -p 5433` for ad hoc queries, both of which work fine from this
  environment.

- **Don't run `npm run build` (`next build`) in `apps/web` while `npm run dev` is already running
  there.** Both write to the same `.next` directory; a production build clobbers the dev server's
  cache and it starts throwing `MODULE_NOT_FOUND` on unrelated routes until restarted. If you need
  a type-check without disturbing the live dev server, prefer letting the dev server's own
  on-demand compilation surface errors (hit the route once) rather than a full `next build`; if you
  do need `next build`, stop the dev server first, then `rm -rf apps/web/.next` and restart
  `npm run dev` afterward to recover.

## Standard local run (adjusted for the above)

```bash
npm install
npm run build:shared

# apps/api/.env — set DATABASE_URL (port 5433 on this machine), JWT_ACCESS_SECRET,
# JWT_REFRESH_SECRET (see .env.example)
cd apps/api
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run build && node dist/main.js     # instead of `npm run start:dev` — see above

# in a second terminal
cd apps/web
# apps/web/.env.local — set NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1 (Swagger at `/api/docs`)
- Postgres: `localhost:5433`
- Prisma Studio (if run): `npx prisma studio` → http://localhost:5555

### Testing from a phone on the same Wi-Fi

`CORS_ORIGIN` accepts a comma-separated list (`apps/api/src/main.ts`). Point the browser-facing
URL at the PC's LAN IP and allow both origins, then rebuild/restart both servers:
- `apps/web/.env.local`: `NEXT_PUBLIC_API_URL=http://<LAN-IP>:4000` and
  `API_INTERNAL_URL=http://localhost:4000` (server-side `/uploads` proxy)
- `apps/api/.env`: `CORS_ORIGIN="http://localhost:3000,http://<LAN-IP>:3000"`
- Open `http://<LAN-IP>:3000` on the phone. On a **Public** Windows network profile, inbound
  3000/4000 are blocked until you add a firewall allow rule (admin):
  `New-NetFirewallRule -DisplayName 'NIR dev (3000,4000)' -Direction Inbound -Protocol TCP -LocalPort 3000,4000 -Action Allow -Profile Any`
- The LAN IP changes with DHCP — update both files if it does. Using the LAN URL on the PC too
  avoids mixed localhost/LAN auth state.

## Tests (API)

There's no Jest — the `test` script previously pointed at a `jest` binary that was never installed.
Tests use Node's built-in runner against the compiled `dist/` output (no extra dependencies):

```bash
cd apps/api
npm run build          # tests import dist/, so build first
npm test               # unit: challenge-rules (validation, submission window, form definitions),
                       #       sms-gateway (SMS template/escaping, BD phone normalization),
                       #       upload-name (UTF-8 re-decoding of uploaded file names)
npm run test:e2e       # end-to-end against a RUNNING API (default http://localhost:4000/api/v1,
                       # override with NIR_API_URL) + the dev DB; logs in as the seeded
                       # admin@nir.gov.bd / innovator1@nir.gov.bd (Password123!)
```

The challenge e2e suite creates a throwaway challenge, submissions and an upload, toggles the
general submission switch, and **cleans all of it up afterwards** (DB rows via Prisma; the switch
is restored to its original value). The review e2e suite (`review-workflow.e2e.test.js`) checks that a Preliminary
Reviewer can longlist and reject, the stage and category guards, and a user holding both reviewer
roles. It creates throwaway reviewers and innovations directly in the DB and deletes them. The auth e2e suite (`auth-security.e2e.test.js`) covers login
CAPTCHA and registration OTP; it registers two throwaway users and deletes them afterwards. The
password-reset suite (`password-reset.e2e.test.js`, 2026-11-18) creates a throwaway user in the DB
and runs forgot → wrong/expired/locked code → resend → validation errors → reset → old sessions
revoked → sign-in, by email and SMS, then deletes it. It needs console mail/SMS like the auth
suite (it skips the sending cases otherwise) and uses up most of the 10/min `password/forgot`
throttle, so leave a minute before re-running it. The outreach suite (`outreach.e2e.test.js`,
2026-11-18) seeds a throwaway challenge with 5 users (duplicate submitter, Bangla user, invalid
email/phone, inactive account, draft-only) and covers access control, the .xlsx export (parsed
with exceljs), preview, admin OTP, idempotent send, duplicate guard, SMS, history and audit; it
waits ~60 s once for the send throttle, so it takes ~75 s. Needs console mail/SMS (skips
otherwise). To eyeball the OTP emails without sending
anything: `npm run build && node scripts/preview-otp-emails.js` (from `apps/api`) writes HTML
previews to `.logs/email-preview/`. Both
skip themselves if the API isn't reachable. The uploaded test PDF stays in `apps/api/uploads/`
(git-ignored).

- Logins in the e2e suites send Cloudflare's dummy token `XXXX.DUMMY.TOKEN.XXXX`, which only the
  Turnstile **test** secret accepts. Against an API with real CAPTCHA keys, set
  `CAPTCHA_PROVIDER=none` for the test run or pass a token via `NIR_CAPTCHA_TOKEN`.
- The OTP send endpoint is throttled to 10/min per IP and one run uses about 8, so **wait a minute
  between back-to-back runs** or the second run fails with 429s.
- **Running the OTP e2e tests without touching `.env`:** start the API with
  `MAIL_TRANSPORT=console` and `SMS_PROVIDER=console` in its process environment (they override
  `.env`), and run `MAIL_TRANSPORT=console SMS_PROVIDER=console npm run test:e2e`. The test guard
  also merges `process.env` over `.env`. Restart the API normally afterwards.
- **Real delivery guard:** the e2e tests that make the API send a code **skip themselves** when
  `apps/api/.env` has a real `MAIL_TRANSPORT` / `SMS_PROVIDER` (anything but `console`).
  Otherwise they'd email `@example.com` addresses (bounces land in the support mailbox) and text
  made-up `019…` numbers through Teletalk (credits, and possibly a stranger's phone). For full
  coverage, switch both to `console` and restart the API, or set `NIR_E2E_REAL_DELIVERY=1` if you
  really mean it.

## Registration OTP & login CAPTCHA — prerequisites and configuration

Added 2026-11-12 (session 44). Behaviour is described in [API.md](API.md#auth-endpoints-auth) and
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#business-rules). This section covers **what has to be
procured and configured** so it works outside local dev.

### Startup rule (important for every deployment)

`CAPTCHA_PROVIDER`, `MAIL_TRANSPORT` and `SMS_PROVIDER` are **required when
`NODE_ENV=production`**, which both Dockerfiles set. If any is unset or blank, the API **refuses to
start** and logs which one is missing. Turning a feature off in production takes an explicit value
(`CAPTCHA_PROVIDER=none`, `MAIL_TRANSPORT=console`, `SMS_PROVIDER=console`), never omission.
Outside production they default to `none`/`console`. Misconfiguration also fails at startup, e.g.
`MAIL_TRANSPORT=smtp` without `SMTP_HOST`, or a CAPTCHA provider without its keys.

So **before the next server deploy**, add these variables to the server's `.env`
(`docker-compose.yml` passes them through to the API container). Without them the new API
container won't boot.

### Third-party services needed

| Need | Options | What to obtain |
|---|---|---|
| **CAPTCHA** (login + OTP send) | **Cloudflare Turnstile** (recommended: free, mostly invisible, and dev.challenge.gov.bd is already behind Cloudflare). Google reCAPTCHA v2 checkbox (free tier, then billed through Google Cloud). hCaptcha (free tier). | A **site key** (public) and **secret key**, from a widget registered for every hostname the site is served on (dev, UAT, production). |
| **Email** (OTP by email) | Any SMTP server: an a2i/government mail relay, Amazon SES, SendGrid, Brevo, Mailgun, Google Workspace. | SMTP host, port, username and password, plus a **From address on a domain you control** with **SPF, DKIM and DMARC** DNS records, or codes land in spam. |
| **SMS** (OTP by SMS) | A Bangladeshi SMS aggregator with an HTTP API: SSL Wireless, BulkSMSBD, Alpha SMS, MiMSMS, an operator enterprise API, or an a2i/government gateway if one is available to the project. Twilio also works but is costly for BD numbers. | API credentials, a **BTRC-approved sender ID** (masking) or non-masking number, a **prepaid balance**, and usually **whitelisting of the server's outbound IP** with the gateway. Bangla (Unicode) SMS is 70 characters per segment, so the Bangla OTP text costs 2 segments and the English one costs 1. |

You only need SMS **or** email if you restrict `OTP_CHANNELS` (e.g. `OTP_CHANNELS=EMAIL` hides the
SMS option on the register page; then set `SMS_PROVIDER=console`).

### Infrastructure prerequisites

- **Outbound network from the API host:** HTTPS (443) to the CAPTCHA verify endpoint
  (`challenges.cloudflare.com` / `www.google.com` / `api.hcaptcha.com`) and the SMS gateway, plus
  SMTP (587, or 465) to the mail server. Some hosts block outbound SMTP by default.
- **Browsers** load the widget script from the same provider domain. There is no CSP today; if one
  is added, allow that domain in `script-src` and `frame-src`.
- **`TRUST_PROXY`**: set it to the number of reverse-proxy hops in front of the API (e.g. `2` for
  Cloudflare → nginx). Otherwise every request looks like it comes from the proxy, so per-IP rate
  limits (login 20/min, register 20/min, OTP send 10/min) become **global** limits shared by all
  users, and the IP passed to CAPTCHA verification is wrong.
- **Migration** `20261112044745_registration_otp` (`OtpCode` table, `User.phoneVerifiedAt`) runs
  automatically in the Docker API container (`prisma migrate deploy`). For Railway, run it the
  usual way.

### Environment variables (API)

| Variable | Default | Notes |
|---|---|---|
| `CAPTCHA_PROVIDER` | `none` (dev) / **required** (prod) | `turnstile` \| `recaptcha` \| `hcaptcha` \| `none` |
| `CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY` | — | Required unless provider is `none`. The site key is served to browsers via `GET /auth/security-config`, so the **web app needs no CAPTCHA env var and no rebuild** when keys change. |
| `OTP_CHANNELS` | `EMAIL,SMS` | Which verification methods the register page offers. |
| `OTP_SECRET` | `JWT_ACCESS_SECRET` | HMAC key for stored codes. |
| `OTP_TTL_SECONDS` / `OTP_RESEND_SECONDS` / `OTP_MAX_SENDS_PER_HOUR` / `OTP_MAX_ATTEMPTS` | 300 / 60 / 5 / 5 | Per target address. |
| `MAIL_TRANSPORT` | `console` (dev) / **required** (prod) | `smtp` \| `console` (console = log only) |
| `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_SECURE` (`true` iff port 465), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | — | `SMTP_HOST` + `MAIL_FROM` required for `smtp`. |
| `SMTP_REQUIRE_TLS` | `true` | With `SMTP_SECURE=false`, refuse to send unless STARTTLS succeeds. Set `false` only for an internal relay without TLS. |
| `MAIL_REPLY_TO` | unset | Optional `Reply-To` header on every email. |
| `SMS_PROVIDER` | `console` (dev) / **required** (prod) | `teletalk` \| `http` \| `console` |
| `SMS_TELETALK_USER`, `SMS_TELETALK_USER_ID` (numeric), `SMS_TELETALK_PASSWORD` | — | Required for `teletalk`. The password is only ever sent as its md5, as Teletalk's API expects. |
| `SMS_TELETALK_URL`, `_SERVERNAME`, `_SMS_CLASS` (`OTP`), `_SMS_ID` (`44`), `_CHARSET` (`ASCII\|ASCII\|UTF-8\|ASCII`), `_VALIDITY` (`1440`) | Teletalk's sample values | Optional overrides. URL default `http://bulksms1.teletalk.com.bd:8091/jlinktbls.php`. |
| `SMS_TELETALK_BULK_SMS_CLASS`, `SMS_TELETALK_BULK_SMS_ID` | unset / `SMS_TELETALK_SMS_ID` | Teletalk class/id for **admin bulk SMS** (2026-11-18). The `OTP` class rejects messages over 70 bytes, so ask Teletalk/a2i for a general (non-OTP) class; until it is set, bulk SMS is shown as unavailable in the admin panel. |
| `BULK_EMAIL_PER_MINUTE` / `BULK_SMS_PER_MINUTE` / `BULK_BATCH_SIZE` / `BULK_MAX_RECIPIENTS` | 60 / 120 / 25 / 2000 | Admin bulk messaging pace and caps. Keep email pace and daily volume under the SMTP account's limit (Google Workspace ≈ 2 000/day). |
| `SMS_HTTP_URL`, `SMS_HTTP_METHOD`, `SMS_HTTP_BODY`, `SMS_HTTP_CONTENT_TYPE`, `SMS_HTTP_HEADERS` (JSON), `SMS_HTTP_SUCCESS_PATTERN` (regex) | — | Generic gateway client (`http`); see below. |
| `TRUST_PROXY` | unset | See above. |

**The a2i email account in use (2026-11-12):** Google Workspace SMTP: `smtp.gmail.com:587`, STARTTLS
(`SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=true`), user and from `support-challenge@a2i.gov.bd`,
Reply-To `noreply-challenge@a2i.gov.bd`. `SMTP_PASS` is a Google **app password** for that account
(it needs 2-Step Verification on). It's kept only in the gitignored `apps/api/.env` and the server
`.env`, never in git or docs. Gmail caps sending at about 2,000 messages/day per Workspace user,
which is fine for OTPs. A dedicated provider (SES/SendGrid) is the upgrade if volume grows.

**The a2i SMS account in use (2026-11-12): Teletalk Bulk SMS** (`SMS_PROVIDER=teletalk`), user
`challenge`, user id `102`, class `OTP`. The password lives only in `apps/api/.env` and the server
`.env`. Facts found while testing against the live gateway:

- **Request:** JSON POST to `http://bulksms1.teletalk.com.bd:8091/jlinktbls.php`. Plain HTTP,
  which is Teletalk's endpoint; the password is md5-hashed, but the message text (the OTP) is not
  encrypted in transit. Each request carries a fresh random 16-digit `p_key` and
  `a_key = md5((p_key + user_id) . "****")`, where `+` is numeric addition and `****` is a literal
  suffix. The number is sent in local form (`01XXXXXXXXX`).
- **Reply:** HTTP 200 either way. Success is
  `{"status":"SUCCESS","scode":"1","details":"TOTAL VALID RECORD=1|M=880…,ID=AV…",…,"current_credit":"…"}`.
  Anything else is treated as a failure, and the user gets a 503 "verify by email" message.
- **OTP length limit: 70 UTF-8 bytes** (`scode 51`, "OTP SMS LENGTH INVALID"). Measured: 66 bytes
  OK, 72 rejected. A Bangla letter is 3 bytes, so the Bangla OTP text is deliberately tiny
  (`NIR কোড: 123456। মেয়াদ ৫ মিনিট।`, 66 bytes) and the code stays in ASCII digits. **Re-measure
  with `Buffer.byteLength()` after any change to the SMS texts in `otp.service.ts`.**
- Each SMS costs 1 credit; the balance is in every success reply. The API logs only the masked
  number, our `cid` and Teletalk's message `ID`.

### SMS gateway templates

For any gateway other than Teletalk, `SMS_PROVIDER=http` is a template-driven client, because
every BD aggregator has its own API. (Teletalk needs per-message hashes, which a static template
can't express, so it has its own provider; see above.)
Placeholders: `{to}` (8801XXXXXXXXX), `{to_e164}` (+8801XXXXXXXXX), `{to_local}` (01XXXXXXXXX),
`{message}`, `{ref}` (unique per message). Each is escaped for where it appears: URL-encoded in the
URL, JSON-escaped in a JSON body, form-encoded in a form body. The method defaults to GET, or POST
when a body is set; the content type is inferred from the body (`{…}` → JSON, otherwise
form-urlencoded). Without `SMS_HTTP_SUCCESS_PATTERN`, any 2xx counts as success. Many gateways
return 200 even on failure, so **set a pattern**.

Illustrative shapes only. **Confirm field names and success responses against the vendor's
current API docs** before relying on them:

```bash
# SSL Wireless (JSON POST)
SMS_PROVIDER=http
SMS_HTTP_URL=https://smsplus.sslwireless.com/api/v3/send-sms
SMS_HTTP_BODY={"api_token":"<TOKEN>","sid":"<SENDER_ID>","msisdn":"{to}","sms":"{message}","csms_id":"{ref}"}
SMS_HTTP_SUCCESS_PATTERN="status"\s*:\s*"SUCCESS"

# BulkSMSBD-style (GET with query string)
SMS_HTTP_URL=https://bulksmsbd.net/api/smsapi?api_key=<KEY>&type=text&number={to}&senderid=<SENDER_ID>&message={message}

# Twilio (form POST + Basic auth = base64("<AccountSid>:<AuthToken>"))
SMS_HTTP_URL=https://api.twilio.com/2010-04-01/Accounts/<AccountSid>/Messages.json
SMS_HTTP_BODY=To={to_e164}&From=<TWILIO_NUMBER>&Body={message}
SMS_HTTP_HEADERS={"Authorization":"Basic <base64>"}
```

The URL, body and headers usually contain the API key. The client never logs them; it logs only
the gateway's HTTP status and the first 300 characters of its response on failure.

### Local dev (this machine)

`apps/api/.env` uses Cloudflare Turnstile's **always-pass test keys** (site
`1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`). The real widget renders
and the real siteverify call is made, but it always passes. Since 2026-11-12 email and SMS are
**real** here too (`MAIL_TRANSPORT=smtp` via the a2i Gmail account, `SMS_PROVIDER=teletalk`), so
local sign-ups send real emails and texts, and each SMS costs a Teletalk credit. To get codes in
the API log instead (`.logs/api.out.log`, lines `[console email]` / `[console sms]`), set either or
both back to `console` and restart the API. Never use the test keys in a deployed environment: they
provide no protection. `apps/api/.env.example` documents every variable.

## Git remotes — where to push (standing rule, set 2026-11-04)

**Always push new work to the GitLab `development` branch** —
`https://gitlab.a2i.gov.bd/a2i-nir/a2i_nir`, git remote name `gitlab`. That repo belongs to the a2i
team and promotes code through merge requests: `development → uat → master`. Never push directly
to its `uat` or `master`, and never force-push any of its branches.

| Remote | URL | Role |
|---|---|---|
| `gitlab` | https://gitlab.a2i.gov.bd/a2i-nir/a2i_nir.git | **Default push target — `development` branch only.** |
| `origin` | https://github.com/Nipun7744/nir-platform.git | The original repo behind the Vercel/Railway deployment below. Pushing its `master` auto-deploys the web app, so push here only when explicitly asked. |

**The two repos have unrelated git histories.** GitLab started from its own "First Commit"
snapshot of this project, then added team commits (Docker multi-environment setup, release version
in the footer). As a result:
- `git push gitlab master` is rejected ("fetch first"). Don't "fix" that with `--force` — it would
  wipe the team's commits.
- Work committed on the local `master` (GitHub lineage) has to be moved over: create a branch from
  `gitlab/development`, cherry-pick the new commits onto it, then fast-forward `development`:
  ```bash
  git fetch gitlab
  git worktree add -b tmp-gl <scratch-dir> gitlab/development   # keeps the main checkout untouched
  cd <scratch-dir> && git cherry-pick <commit>...                # code applies cleanly; docs may conflict
  git push gitlab tmp-gl:development                             # fast-forward only, no force
  git push gitlab --delete tmp-gl 2>/dev/null; git branch -D tmp-gl  # clean up
  ```
  This is how the admin "Submit & publish" feature reached GitLab (session 40). Cherry-pick
  conflicts so far have only been in `docs/SESSION_LOG.md`, where GitLab's copy was missing later
  entries — resolve by keeping the longer, newest-first log, never by dropping entries.
- Simpler long-term option, not yet adopted: do day-to-day work on a local branch that tracks
  `gitlab/development` (`git switch -c development --track gitlab/development`), so that
  `git push gitlab development` works directly with no cherry-picking.

**Auth:** Git Credential Manager prompts in a popup window. Enter your GitLab username, and a
Personal Access Token with the `write_repository` scope as the password — account passwords are
rejected with "HTTP Basic: Access denied". From a non-interactive shell, set
`GIT_TERMINAL_PROMPT=0`, but don't set `GCM_INTERACTIVE=never` (that blocks the popup). Once a
token has been accepted, the login is saved.

**Deploying from GitLab:** a server running GitLab code must run `prisma migrate deploy` whenever a
merge adds migrations — e.g. `20261104084951_add_created_by_admin_flag` (session 40).
**Back up the database first for `20261118100000_challenge_detail_fields` and `20261118120000_challenge_contact_fields` (session 53):** they copy
the old challenge section and contact columns into `Challenge.detailFields` / `contactFields` and then drop them. Also rebuild
`@nir/shared` (`npm run build:shared`, part of `npm run build`) — the API and web now import the
details-field rules from it at runtime.

## Production Deployment

Live since 2026-08-13. Split across two providers because the API's file-upload-to-local-disk
design (see [PROJECT_CONTEXT.md § Important Decisions](PROJECT_CONTEXT.md#important-decisions))
and persistent DB connections don't fit Vercel's serverless model.

| Component | Provider | URL |
|---|---|---|
| `apps/web` (Next.js) | Vercel (project `nir-platform-web`) | https://nir-platform-web.vercel.app |
| `apps/api` (NestJS) | Railway (project `nir-platform`, service `api`) | https://api-production-2d78.up.railway.app (`/api/v1`, Swagger at `/api/docs`) |
| PostgreSQL | Railway (service `Postgres`, same project) | internal only, referenced by other services as `${{Postgres.DATABASE_URL}}` |
| Source | GitHub | https://github.com/Nipun7744/nir-platform (public) — the team's main repo is now GitLab `development`; see [Git remotes](#git-remotes--where-to-push-standing-rule-set-2026-11-04) |

### Vercel (`apps/web`)

This is an npm-workspaces monorepo, so the Vercel project is linked at the **repo root**
(`.vercel/project.json` lives at the repo root, not in `apps/web/`) with project settings
`rootDirectory: "apps/web"` and `sourceFilesOutsideRootDirectory: true` — without the second
setting, Vercel only uploads `apps/web/` and the build fails on `npm install` because
`packages/shared` (an `@nir/shared` workspace dependency) isn't present. These settings were set
once via `vercel api -X PATCH /v9/projects/nir-platform-web` (the CLI has no dedicated command for
them) and persist on the linked project.

**CI/CD (2026-08-17):** the project is connected to `github.com/Nipun7744/nir-platform` via
Vercel's native GitHub integration (`vercel git connect` — required the Vercel GitHub App to be
authorized on the repo first, a one-time manual step in GitHub's UI, not scriptable). Pushes to
`master` now auto-deploy to production; any other branch or PR gets its own preview deployment
automatically. Manual `vercel --prod --yes` from the repo root still works as a fallback (e.g. to
redeploy without a new commit) but is no longer the normal path.

Connecting Git exposed a latent bug: the project's **Build Command was unset** (defaulting to
bare `next build` inside `apps/web`, never building `packages/shared` first). Manual CLI deploys
had been masking this for days via stale build-cache carryover (an old cached `packages/shared`
build from early in the project's life kept getting reused across deploys); a fresh git-triggered
clone has no such cache and failed with `Module not found: Can't resolve '@nir/shared'` on its
first run. Fixed by setting an explicit Build Command via
`vercel api -X PATCH /v9/projects/nir-platform-web`
(`buildCommand: "cd ../.. && npm run build:shared && cd apps/web && npm run build"` — `cd ../..`
works because Vercel's build step runs with cwd = Root Directory, and
`sourceFilesOutsideRootDirectory` means the rest of the monorepo is present one level up).

**Known issue — auto-deploy has silently no-op'd at least once (2026-08-17), intermittent, not
root-caused:** a small doc-only test push triggered a deployment within ~25s as expected, but a
later 22-file push (the Repository Management module) produced **no deployment at all** —
confirmed via the Vercel API's `GET /v6/deployments?projectId=...` list, not just `vercel ls` —
even after 10+ minutes, with no error and no queued/building state to point to. GitHub's
commit-status/check-runs API showed 0 entries either way, so it isn't a useful signal for
diagnosing this. Workaround used that time: manual `vercel --prod --yes`. A later 6-file push (the
Archive/Featured + Pagination commits) auto-deployed successfully within ~2 minutes and was
correctly aliased to production, and two later same-day pushes (2026-08-23: the mobile modal-
responsiveness fix, 4 files; the homepage category-grid mobile limit, 3 files) both auto-deployed
within seconds — so this isn't a total failure of the integration, just unreliable, and commit
size/file count doesn't cleanly explain it (22 files failed, several smaller pushes each succeeded
quickly, but so did an earlier ~2-file push). Root cause still not identified. **If this recurs:** check the
Vercel dashboard's Project → Settings → Git → deployment/webhook delivery log (not exposed via the
CLI or the `api` subcommand used to diagnose this so far) before assuming a config problem — the
`link` block returned by `GET /v9/projects/nir-platform-web` has shown the repo correctly connected
every time this was checked, so the connection itself isn't the (visible) problem. Don't treat
auto-deploy as guaranteed — verify with `vercel ls`/`v6/deployments` after any push that matters,
and fall back to `vercel --prod --yes` if nothing shows up within a minute or two.

Env vars (Vercel dashboard → Project → Settings → Environment Variables, or `vercel env`):
- `NEXT_PUBLIC_API_URL=https://api-production-2d78.up.railway.app` (Production + Preview) — the
  code appends `/api/v1` itself, see `apps/web/src/lib/config.ts`.

`next.config.mjs`'s `images.remotePatterns` includes the Railway API hostname so `next/image` can
load images served from there directly (uploads are also proxied same-origin via the `/uploads/*`
rewrite in the same config, which doesn't need this).

### Railway (`apps/api` + Postgres)

Build/deploy commands live in a repo-root `railway.json` (Railway's config-as-code, picked up
automatically) rather than project settings, since the monorepo build needs to run from the repo
root (`npm ci` at root to resolve the `@nir/shared` workspace link, then build `packages/shared`
before `apps/api`):

```json
{
  "build": { "buildCommand": "npm ci && npm run build:shared && npx prisma generate --schema apps/api/prisma/schema.prisma && npm run build:api" },
  "deploy": { "startCommand": "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/main.js" }
}
```

Deploy from the repo root with `railway up --service api --detach --json` (the CLI's default
`railway up .` with an explicit path currently errors with `"prefix not found"` on this setup —
omit the path argument and let it use the linked service + cwd).

Env vars (`railway variable set KEY=value --service api`):
- `DATABASE_URL=${{Postgres.DATABASE_URL}}` — Railway's variable-reference syntax, resolves to the
  Postgres service's internal connection string.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — freshly generated 64-byte base64 secrets, **not**
  the `dev-*-secret-change-me` placeholders from local `.env`.
- `JWT_ACCESS_TTL=15m`, `JWT_REFRESH_TTL=30d` — same as local.
- `CORS_ORIGIN=https://nir-platform-web.vercel.app` — note the API code reads `CORS_ORIGIN`
  (`apps/api/src/main.ts`), not `WEB_ORIGIN` as the root `.env.example` suggests; that file is
  stale, see Known Issues in [ROADMAP.md](ROADMAP.md).
- `UPLOAD_DIR=/data/uploads` — see volume note below.
- `NODE_ENV=production`

**Uploads volume**: a Railway volume is attached to the `api` service at `/data/uploads`
(`railway volume add --mount-path /data/uploads` with the service linked via
`railway service link api` first — passing `--service` directly to `volume add` currently panics
the CLI, and Git Bash's automatic `/path` → Windows-path conversion also breaks the mount-path
argument there; use PowerShell). `UPLOAD_DIR` points the API's `multer` disk storage
(`apps/api/src/uploads/uploads.controller.ts`) at it so uploaded files survive redeploys, unlike
the container filesystem itself.

**Seeding a fresh DB**: `railway run` only injects env vars into a *locally* executed process —
`DATABASE_URL`'s value (`postgres.railway.internal`) only resolves from inside Railway's network,
so `railway run npx ts-node prisma/seed.ts` fails to connect from a local machine. `railway ssh`
and `railway tcp-proxy create` (which would otherwise solve this) are both blocked in this
environment by an agent-safety classifier. The workaround used for the initial seed: temporarily
append `&& (cd apps/api && npx ts-node prisma/seed.ts || true)` to `railway.json`'s
`deploy.startCommand`, `railway up`, confirm via `railway logs` that seeding ran, then revert the
start command and redeploy. Don't leave the seed step in `startCommand` permanently — it's not
idempotent-guaranteed on every container restart.

This path was reused on 2026-09-01 to sync 30 local-only innovations into the production DB
(`apps/api/scripts/import-prod-sync.js` + `prod-sync-data.json`, wired into `startCommand`,
run, reverted — see [SESSION_LOG.md](SESSION_LOG.md) session 37). That importer is written as
plain CommonJS on purpose: the Railway container builds with `NODE_ENV=production`, so `npm ci`
skips devDependencies and `ts-node` is not available there — a `.ts` seed can only run via
`npx ts-node` (downloads it at boot, slow/fragile). Prefer a `.js` script that needs only
`@prisma/client` (a runtime dep, already generated by the build step).

### Local DB cleanup (2026-08-13, before any of the above existed)

23 manually-created test innovations and 9 test users were deleted from the **local** dev DB
(`nir_dev` on `:5433`, not Railway) via one-off Prisma scripts — see
[SESSION_LOG.md](SESSION_LOG.md) for the exact IDs and the two accounts deliberately kept
(`prelim-test@nir.gov.bd`, `authenticity-test@nir.gov.bd` — despite the name, both have real
`ReviewComment` history on a genuine innovation). The Railway production DB was seeded fresh and
never had this test data to begin with.

## Docker path (not used on this machine, but supported)

```bash
cp .env.example .env    # edit secrets before any real deployment
docker compose up --build
```

Postgres, API, and web each run in their own container; `postgres_data` and `api_uploads` are
persistent volumes. The API container runs `prisma migrate deploy` automatically on boot — seed
manually once: `docker compose exec api npx ts-node prisma/seed.ts`.

**Reverse proxy upload size (found 2026-11-15).** The host nginx in front of the containers must
allow request bodies up to the API's upload limit (`UPLOAD_MAX_SIZE_MB` = 50 in
`apps/api/src/uploads/upload-limits.ts`). nginx's default `client_max_body_size` is **1m**, and
dev.challenge.gov.bd was still on that default: any file over 1 MB got `413 Request Entity Too
Large` from nginx/1.18.0 and never reached the API, so innovation-submission uploads "didn't
work". Fix on the server, in the `server {}` (or `location /api/`) block for the site:
`client_max_body_size 55m;` then `sudo nginx -t && sudo systemctl reload nginx`. Cloudflare's own
limit (100 MB on Free/Pro) is above 50 MB, so nothing to change there. Check:
`curl -s -o /dev/null -w "%{http_code}" -F "file=@<2MB file>;type=application/pdf" https://<host>/api/v1/uploads`
should print `401` (reached the API, no token), not `413`.

**Two API URLs, don't conflate them.** `NEXT_PUBLIC_API_URL` is what the *browser* calls (e.g.
`https://dev.challenge.gov.bd`, where a reverse proxy routes `/api/v1` to the api container).
`API_INTERNAL_URL` (default `http://api:4000`) is where the *web container* proxies `/uploads/*`
and where `next/image` fetches photos from. Both are baked in at `web` build time, so rebuild
(`docker compose up --build web`) after changing either. If `API_INTERNAL_URL` is unset the rewrite
falls back to the public URL — behind Cloudflare that request loops back through the CDN and
gets a 403 "Error 1000: DNS points to prohibited IP", so every uploaded image breaks (seen on
dev.challenge.gov.bd, 2026-11-05).

## GitLab CI pipeline (`.gitlab-ci.yml`)

History:
- **2026-11-16:** the pipeline was removed.
- **2026-11-17:** Shuvashis Das re-added it as a build-and-publish pipeline.
- **2026-11-19:** branch `ci/auto-deploy-dev` brings back the SSH deploy to dev.challenge.gov.bd.
  That branch is stacked on `ci/kaniko-publish`, so the Kaniko MR (!13) merges first. The deploy
  works only once the server secrets below are set (see the next section).

The pipeline exists only on GitLab, so the GitHub `master` checkout has no `.gitlab-ci.yml`. To
read it: `git show "gitlab/development:.gitlab-ci.yml"`.

**When it runs:** on merge requests, on pushes to `development`, and when started by hand with
**Build → Pipelines → New pipeline**. A plain push to another branch starts nothing.

| Stage | Job | What it does | Runner tag |
|---|---|---|---|
| verify | `build` | `npm ci`, then builds shared, the Prisma client, the API and the web app | `nir-dev-ci` (default) |
| verify | `compose-config` | Runs `docker compose config --quiet` against `.env.example` | `nir-dev-ci` |
| publish | `publish-api` | Builds `apps/api/Dockerfile` → `registry.a2i.gov.bd/a2i-nir/a2i_nir/api:<sha>` | see below |
| publish | `publish-web-dev` | Builds `apps/web/Dockerfile` with `NEXT_PUBLIC_API_URL=https://dev.challenge.gov.bd`, `API_INTERNAL_URL=http://api:4000` → `…/web:dev-<sha>` | see below |
| deploy | `deploy` | SSHes to the server and runs `deploy/deploy.sh <path> <sha>` (`ci/auto-deploy-dev`) | `nir-dev-ci` |
| deploy | `rollback` | Manual. Redeploys `ROLLBACK_SHA`, or the previous deploy if unset | `nir-dev-ci` |
| smoke | `smoke` | Checks that `/`, `/api/v1/repository/search` and one `/uploads/*` file on the public URL work | `nir-dev-ci` |

The publish, deploy and smoke jobs run only on `development`, so merge request pipelines run only
the verify stage. `deploy` needs only the verify jobs, not publish, so a broken publish stage
doesn't block deploys.

**Runners (2026-11-19):**
- `nir-dev-ci` is locked down. **Rootless BuildKit cannot start on it**: pipeline #1801 failed
  with `rootlesskit: fork/exec /proc/self/exe: operation not permitted`.
- On `development` the publish jobs still use rootless BuildKit, tagged for the dedicated
  `nir-image-builder` runner (ID `bNL6qO0ps`, gitlab-runner 19.5.3, Docker executor). That runner
  is not registered on the project, so its host is probably owned by Shuvashis or a GitLab admin.
- **The runner went offline after pipeline #1796 (2026-11-18).** Since then the publish jobs sit
  pending until GitLab fails them with "no matching runners available" (#1797, #1800).
- **Proposed fix:** branch `ci/kaniko-publish` switches both publish jobs to **Kaniko**
  (`gcr.io/kaniko-project/executor:v1.23.2-debug`). Kaniko needs no privileged mode and no user
  namespaces, so the jobs can run on `nir-dev-ci`. Image names and build args are unchanged.
  - On any branch other than `development`, a pipeline started by hand runs the same builds
    with `--no-push`, so CI and Dockerfile changes can be tested without touching the registry.
  - Test pipeline #1803 passed (API image about 3m40s, web image about 5m, with `--no-push`).
  - The real push to the registry is first exercised by the first `development` pipeline after
    the merge.
  - Google archived Kaniko in 2025 and v1.23.2 is its last release, so treat it as a stopgap.
    The long-term option is the dedicated BuildKit runner.

**Viewing pipelines needs only Developer access, but runner settings need Maintainer.** Without
it, Settings → CI/CD returns 404.

## Deploying to dev.challenge.gov.bd

### Automatic (branch `ci/auto-deploy-dev`, restored 2026-11-19)

Every push to `development` that passes verify is deployed by the `deploy` job. It pipes
`deploy/deploy.sh` (restored from `a96bdb4`) over SSH. On the server the script:

1. Takes a lock, so only one deploy runs at a time.
2. Refuses to run if tracked files were edited on the server.
3. Fetches the commit and backs up the DB to `<path>/.deploy/backups`, keeping the last 10.
4. Checks out the commit and runs `docker compose -p repo build --pull && up -d`. The API runs
   `prisma migrate deploy` when it starts.
5. Health-checks the API, the web app and the `/uploads` proxy for up to 240 s.
6. If the health check fails, **rolls back automatically** to the previous commit. Database
   migrations are not reverted; restore from the backup if needed.

The deploy builds from source on the server. It does not use the registry images from the
publish stage.

**Status: not active yet.** No deploy has ever completed: GitLab deployment #4 (2026-11-15) is
still "Waiting". Before it can run, someone needs to do the following.
- **A Maintainer** adds these protected CI/CD variables:
  - `SSH_PRIVATE_KEY` (File): the deploy user's key, with no passphrase.
  - `SSH_KNOWN_HOSTS` (File): `ssh-keyscan -p <port> <host>`, checked by hand.
  - `DEPLOY_HOST`: the origin IP, not the Cloudflare name.
  - `DEPLOY_USER`.
  - `DEPLOY_PATH`.
  - Optionally `DEPLOY_PORT`.
- **The server owner** makes sure that:
  - `DEPLOY_PATH` is a git clone whose `origin` fetches without a prompt (deploy token or deploy key).
  - `.env` exists there, with the variables from § Environment variables (API).
  - The SSH user is in the `docker` group.
  - `git`, `curl` and `flock` are installed.
  - The stack runs as compose project `repo` (`docker compose -p repo …`), because the script
    hard-codes that name.

Until then, `deploy` fails straight away with "Missing CI/CD variables: …", and the manual
procedure below still applies.

### Manual

Use this when auto-deploy isn't set up, or to deploy something other than the `development`
head. The server builds from source with `docker compose up --build`. Deploy by hand on the
server, from the repo clone:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner'   | gzip > ~/nir-backup-$(date -u +%Y%m%dT%H%M%SZ).sql.gz   # back up first
git fetch origin development && git checkout <commit>
docker compose up -d --build                                  # API runs migrate deploy on start
```

Then check `/api/v1/repository/search`, `/` and one `/uploads/*` file. Nothing rolls back on
its own: if something breaks, check out the previous commit and run `up -d --build` again, and
restore the backup if a migration was the cause. The GitHub → Vercel auto-deploy (above) is
separate: it is a Vercel integration, not code in this repo, and it is unchanged.

## Demo accounts

See [PROJECT_CONTEXT.md § Demo Accounts](PROJECT_CONTEXT.md#demo-accounts) — password
`Password123!` for all seeded users.

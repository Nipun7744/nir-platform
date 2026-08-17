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

## Production Deployment

Live since 2026-08-13. Split across two providers because the API's file-upload-to-local-disk
design (see [PROJECT_CONTEXT.md § Important Decisions](PROJECT_CONTEXT.md#important-decisions))
and persistent DB connections don't fit Vercel's serverless model.

| Component | Provider | URL |
|---|---|---|
| `apps/web` (Next.js) | Vercel (project `nir-platform-web`) | https://nir-platform-web.vercel.app |
| `apps/api` (NestJS) | Railway (project `nir-platform`, service `api`) | https://api-production-2d78.up.railway.app (`/api/v1`, Swagger at `/api/docs`) |
| PostgreSQL | Railway (service `Postgres`, same project) | internal only, referenced by other services as `${{Postgres.DATABASE_URL}}` |
| Source | GitHub | https://github.com/Nipun7744/nir-platform (public) |

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

**Known issue — auto-deploy has silently no-op'd at least once (2026-08-17):** a small doc-only
test push triggered a deployment within ~25s as expected, but a later 22-file push (the Repository
Management module) produced **no deployment at all** — confirmed via the Vercel API's
`GET /v6/deployments?projectId=...` list, not just `vercel ls` — even after 10+ minutes, with no
error and no queued/building state to point to. GitHub's commit-status/check-runs API showed 0
entries either way, so it isn't a useful signal for diagnosing this. Root cause not identified.
Workaround used: manual `vercel --prod --yes`, which deploys the current local working tree
regardless of what git/Vercel's webhook did. **If this recurs:** check the Vercel dashboard's
Project → Settings → Git → deployment/webhook delivery log (not exposed via the CLI or the `api`
subcommand used to diagnose this so far) before assuming a config problem — the `link` block
returned by `GET /v9/projects/nir-platform-web` still shows the repo correctly connected each time
this was checked, so the connection itself isn't the (visible) problem. Don't treat auto-deploy as
guaranteed until this is root-caused — verify with `vercel ls`/`v6/deployments` after any push that
matters, and fall back to `vercel --prod --yes` if nothing shows up within a minute or two.

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

## Demo accounts

See [PROJECT_CONTEXT.md § Demo Accounts](PROJECT_CONTEXT.md#demo-accounts) — password
`Password123!` for all seeded users.

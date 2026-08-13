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

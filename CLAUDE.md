# NIR Platform — Instructions for Claude

## `docs/` is the persistent source of truth

This project maintains hand-curated documentation in [`docs/`](docs/) that is meant to persist
project context across sessions. Treat it as authoritative, and keep it that way:

- **PROJECT_CONTEXT.md** — overview, objectives, features, architecture, stack, decisions, business rules
- **API.md** — endpoints, request/response shapes, auth, integration notes
- **DATABASE.md** — schema, relationships, migrations, design decisions
- **UI_GUIDELINES.md** — design tokens, components, layout rules
- **ROADMAP.md** — completed/current/upcoming work, known issues, technical debt
- **SESSION_LOG.md** — chronological log of every working session
- **ROLES.md** — role/permission matrix (RBAC spans the DB schema, API guards, and frontend nav)
- **SETUP.md** — local dev setup, including machine-specific gotchas

### At the start of every session

Read every file in `docs/` before making any changes. Don't rely on memory of a previous
session or on assumptions about the codebase — `docs/` plus the actual current code are the
sources of truth, in that order for *intent*, and the reverse order for *current state* (if code
and docs disagree on what the code currently does, trust the code and fix the doc).

### During the session

When you make a significant change — a new endpoint, a schema change, a new UI pattern, a
decision that overrides something documented, a newly discovered bug or piece of tech debt —
update the relevant `docs/` file(s) as part of that change, not as an afterthought.

### At the end of every session

1. Update every `docs/` file affected by the session's work so it reflects current reality.
2. Add a new entry to `docs/SESSION_LOG.md` (newest on top) covering: date/time, tasks
   completed, files modified, decisions made, bugs fixed, and next steps for whoever picks this
   up next.
3. Double-check `docs/` as a whole is internally consistent — e.g. a new API route belongs in
   both `API.md` and, if it changes permissions, `ROLES.md`.

If a task is small enough that updating six-plus files would be pure overhead (e.g. answering a
question, a one-line typo fix), use judgment — but err toward updating `docs/` rather than
skipping it, since the whole point of this system is that it stays trustworthy.

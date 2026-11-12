#!/usr/bin/env bash
# Server-side deploy for the docker-compose stack. Run by .gitlab-ci.yml over SSH:
#   ssh user@host "bash -s -- <deploy_path> <git_sha|previous>" < deploy/deploy.sh
#
# Steps: lock → refuse on local edits → fetch → DB backup → checkout <sha> → build → up
#        → health-check (API, web, /uploads proxy) → on failure roll back to the old commit.
#
# Server prerequisites (one-time): <deploy_path> is a git clone of this repo whose `origin` can
# fetch without a prompt (deploy token or deploy key), `.env` exists there, the SSH user is in the
# `docker` group, and git, curl, flock are installed.
set -Eeuo pipefail

DEPLOY_PATH=${1:?usage: deploy.sh <deploy_path> <git_sha|previous>}
TARGET_SHA=${2:?usage: deploy.sh <deploy_path> <git_sha|previous>}
BRANCH=${DEPLOY_BRANCH:-development}
KEEP_BACKUPS=${KEEP_BACKUPS:-10}
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-240}

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { log "ERROR: $*"; exit 1; }
trap 'log "ERROR: command failed at line $LINENO"' ERR

cd "$DEPLOY_PATH"
STATE_DIR="$DEPLOY_PATH/.deploy"
mkdir -p "$STATE_DIR/backups"

# One deploy at a time, even if someone runs this by hand while CI is deploying.
exec 9>"$STATE_DIR/lock"
flock -n 9 || die "another deploy is already running"

[ -f .env ] || die ".env missing in $DEPLOY_PATH"
if ! git diff --quiet || ! git diff --cached --quiet; then
  git status --short
  die "tracked files were edited on the server; commit them to git (or 'git stash') first"
fi

git fetch --prune --quiet origin "$BRANCH"
if [ "$TARGET_SHA" = "previous" ]; then
  [ -s "$STATE_DIR/previous_sha" ] || die "no previous deploy recorded"
  TARGET_SHA=$(cat "$STATE_DIR/previous_sha")
fi
git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null || die "commit $TARGET_SHA not found after fetch"
CURRENT_SHA=$(git rev-parse HEAD)
log "current ${CURRENT_SHA:0:8} → target ${TARGET_SHA:0:8}"

# ---- DB backup (migrations run automatically when the api container starts) ----
if docker compose ps --status running --services | grep -qx postgres; then
  backup="$STATE_DIR/backups/nir-$(date -u +%Y%m%dT%H%M%SZ)-${CURRENT_SHA:0:8}.sql.gz"
  log "backing up database → $backup"
  docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' \
    | gzip > "$backup" || { rm -f "$backup"; die "database backup failed"; }
  ls -1t "$STATE_DIR"/backups/*.sql.gz | tail -n +"$((KEEP_BACKUPS + 1))" | xargs -r rm --
else
  log "postgres not running — skipping backup (first deploy?)"
fi

health_check() {
  local api web deadline file
  deadline=$((SECONDS + HEALTH_TIMEOUT))
  while [ "$SECONDS" -lt "$deadline" ]; do
    api=$(docker compose port api 4000 2>/dev/null || true)
    web=$(docker compose port web 3000 2>/dev/null || true)
    if [ -n "$api" ] && [ -n "$web" ] \
      && curl -fsS -o /dev/null --max-time 5 "http://$api/api/v1/repository/search" \
      && curl -fsS -o /dev/null --max-time 5 "http://$web/"; then
      # The web → api /uploads proxy (broken once by a Cloudflare loop) must serve a real file.
      file=$(docker compose exec -T api sh -c 'ls -1 uploads 2>/dev/null | head -n 1' || true)
      if [ -z "$file" ]; then
        log "healthy (no uploads to test)"
        return 0
      fi
      if curl -fsS -o /dev/null --max-time 10 "http://$web/uploads/$file"; then
        log "healthy (api, web, /uploads/$file)"
        return 0
      fi
      log "web is up but /uploads/$file fails — check API_INTERNAL_URL"
    fi
    sleep 5
  done
  return 1
}

# Chained with && so a failed build never reaches `up` (set -e is off inside `if` conditions).
release() {
  git checkout --quiet --detach "$1" \
    && docker compose build --pull \
    && docker compose up -d --remove-orphans
}

log "building and starting ${TARGET_SHA:0:8}"
if ! release "$TARGET_SHA" || ! health_check; then
  docker compose ps
  docker compose logs --tail=80 api web || true
  if [ "$CURRENT_SHA" != "$TARGET_SHA" ]; then
    log "health check failed — rolling back to ${CURRENT_SHA:0:8}"
    { release "$CURRENT_SHA" && health_check; } || log "rollback is ALSO unhealthy — manual intervention needed"
    log "note: database migrations are not reverted; backup is in $STATE_DIR/backups"
  fi
  die "deploy of ${TARGET_SHA:0:8} failed"
fi

if [ "$CURRENT_SHA" != "$TARGET_SHA" ]; then
  echo "$CURRENT_SHA" > "$STATE_DIR/previous_sha"
fi
echo "$TARGET_SHA" > "$STATE_DIR/current_sha"

docker image prune -f > /dev/null
docker builder prune -f --filter until=168h > /dev/null || true
log "deployed ${TARGET_SHA:0:8} successfully"

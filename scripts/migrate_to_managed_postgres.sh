#!/usr/bin/env bash
# Migrate from Docker Compose Postgres to a managed Postgres instance.
#
# Usage:
#   export MANAGED_DATABASE_URL='postgresql://user:pass@host:5432/sportsprediction?sslmode=require'
#   ./scripts/migrate_to_managed_postgres.sh
#
# Dry run (preflight + plan only):
#   DRY_RUN=1 ./scripts/migrate_to_managed_postgres.sh
#
# Env:
#   MANAGED_DATABASE_URL  required — target connection string (use sslmode=require in prod)
#   DRY_RUN               optional — 1 = no backup restore or alembic writes
#   SKIP_BACKUP           optional — 1 = skip local pg_dump (not recommended)
#   ROOT_DIR              optional — repo root (default: script parent/..)
#   PG_CONTAINER          optional — source container (default: sport-prediction-postgres)
#   PG_DATABASE           optional — default: sportsprediction
#   PG_USER               optional — default: postgres
#
# See docs/MANAGED_POSTGRES_MIGRATION.md for full runbook.

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT_DIR"

PG_CONTAINER="${PG_CONTAINER:-sport-prediction-postgres}"
PG_DATABASE="${PG_DATABASE:-sportsprediction}"
PG_USER="${PG_USER:-postgres}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"

DOCKER="${DOCKER:-$(command -v docker || true)}"
if [[ -z "$DOCKER" || ! -x "$DOCKER" ]]; then
  DOCKER="/usr/bin/docker"
fi

die() {
  echo "error: $*" >&2
  exit 1
}

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

_pg_client_via_docker() {
  ! command -v pg_restore >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1
}

run_psql() {
  if _pg_client_via_docker; then
    echo "[psql] using api container (postgresql-client on host not found)"
    "${COMPOSE[@]}" run --rm --no-deps \
      -e "PGPASSWORD=${PGPASSWORD:-}" \
      -e "PGSSLMODE=${PGSSLMODE:-require}" \
      api psql "$@"
  else
    psql "$@"
  fi
}

run_pg_restore() {
  local dump="$1"
  shift
  if _pg_client_via_docker; then
    echo "[pg_restore] using api container (postgresql-client on host not found)"
    "${COMPOSE[@]}" run --rm --no-deps \
      -v "${dump}:/dump:ro" \
      -e "PGPASSWORD=${PGPASSWORD:-}" \
      -e "PGSSLMODE=${PGSSLMODE:-require}" \
      api pg_restore "$@" /dump
  else
    pg_restore "$@" "$dump"
  fi
}

PLACEHOLDER_HOSTS='db-host your-managed-host managed-host.example.com localhost'
PLACEHOLDER_USERS='USER APP_USER REPLACE'

is_placeholder_url() {
  eval "$(parse_db_url)"
  local h="${PGHOST,,}"
  local u="${PGUSER,,}"
  for token in $PLACEHOLDER_HOSTS; do
    [[ "$h" == "${token,,}" ]] && return 0
  done
  for token in $PLACEHOLDER_USERS; do
    [[ "$u" == "${token,,}" ]] && return 0
  done
  [[ "$MANAGED_DATABASE_URL" == *"..."* ]] && return 0
  [[ "$MANAGED_DATABASE_URL" == *"REPLACE"* ]] && return 0
  [[ "$MANAGED_DATABASE_URL" == *"REAL_PASSWORD"* ]] && return 0
  return 1
}

require_managed_url() {
  [[ -n "${MANAGED_DATABASE_URL:-}" ]] || die "Set MANAGED_DATABASE_URL (see docs/MANAGED_POSTGRES_MIGRATION.md)"
  [[ "$MANAGED_DATABASE_URL" == postgresql://* ]] || die "MANAGED_DATABASE_URL must start with postgresql://"
  if is_placeholder_url; then
    die "MANAGED_DATABASE_URL looks like a placeholder (db-host / USER / REAL_PASSWORD).
Paste the real connection string from your managed Postgres provider console, e.g.:
  postgresql://doadmin:SECRET@db-postgresql-nyc1-12345.db.ondigitalocean.com:25060/sportsprediction?sslmode=require"
  fi
}

parse_db_url() {
  # Prints shell-assignable lines: PGHOST=... PGPORT=... PGUSER=... PGDATABASE=... PGPASSWORD=...
  python3 - "$MANAGED_DATABASE_URL" <<'PY'
import sys
from urllib.parse import urlparse, unquote, parse_qs

raw = sys.argv[1]
parsed = urlparse(raw)
if parsed.scheme not in ("postgresql", "postgres"):
    raise SystemExit("unsupported scheme")
user = unquote(parsed.username or "")
password = unquote(parsed.password or "")
host = parsed.hostname or ""
port = parsed.port or 5432
db = (parsed.path or "/").lstrip("/") or "postgres"
qs = parse_qs(parsed.query)
sslmode = (qs.get("sslmode") or [""])[0]
print(f"PGHOST={host!r}")
print(f"PGPORT={port!r}")
print(f"PGUSER={user!r}")
print(f"PGPASSWORD={password!r}")
print(f"PGDATABASE={db!r}")
print(f"PGSSLMODE={sslmode!r}")
PY
}

preflight() {
  require_managed_url
  [[ -x "$DOCKER" ]] || die "docker not found"
  if ! "$DOCKER" inspect "$PG_CONTAINER" >/dev/null 2>&1; then
    die "container ${PG_CONTAINER} not running.

This script must run on the host where Docker Postgres holds production data (your VPS).
On the server:
  ssh root@198.211.109.76
  cd ~/sport_prediction
  docker compose ps postgres    # should show Running
  export MANAGED_DATABASE_URL='postgresql://USER:PASS@managed-host:5432/sportsprediction?sslmode=require'
  DRY_RUN=1 ./scripts/migrate_to_managed_postgres.sh

On a local Mac, start Postgres first only if you are testing with local data:
  docker compose up -d postgres"
  fi
  command -v pg_restore >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || \
    die "pg_restore not found and docker unavailable — install postgresql-client or use Docker"
  command -v psql >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || \
    die "psql not found and docker unavailable — install postgresql-client or use Docker"
  if _pg_client_via_docker; then
    echo "[preflight] host postgresql-client missing — will use api container for psql/pg_restore"
  fi

  eval "$(parse_db_url)"
  [[ -n "$PGHOST" ]] || die "could not parse host from MANAGED_DATABASE_URL"
  [[ -n "$PGUSER" ]] || die "could not parse user from MANAGED_DATABASE_URL"
  [[ -n "$PGDATABASE" ]] || die "could not parse database from MANAGED_DATABASE_URL"

  if [[ "$PGSSLMODE" != "require" && "$PGSSLMODE" != "verify-full" && "$PGSSLMODE" != "verify-ca" ]]; then
    echo "warn: MANAGED_DATABASE_URL has no sslmode=require — use TLS for production managed DBs"
  fi

  echo "[preflight] source container: ${PG_CONTAINER}"
  echo "[preflight] target: ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"
}

latest_backup_file() {
  local dir="${BACKUP_DIR:-/root/backups}"
  ls -t "${dir}"/sportsprediction-*.dump 2>/dev/null | head -1 || true
}

take_backup() {
  if [[ "$SKIP_BACKUP" == "1" ]]; then
    echo "[backup] SKIP_BACKUP=1 — using newest existing dump"
    return
  fi
  echo "[backup] creating local dump via pg_backup_docker.sh..."
  BACKUP_DIR="${BACKUP_DIR:-/root/backups}" PG_CONTAINER="$PG_CONTAINER" \
    PG_DATABASE="$PG_DATABASE" PG_USER="$PG_USER" \
    "$ROOT_DIR/scripts/pg_backup_docker.sh"
}

restore_to_managed() {
  eval "$(parse_db_url)"
  local dump
  dump="$(latest_backup_file)"
  [[ -n "$dump" && -f "$dump" ]] || die "no backup dump found under ${BACKUP_DIR:-/root/backups}"

  echo "[restore] using dump: $dump"
  echo "[restore] target must be an empty database created in the provider console"

  export PGPASSWORD
  export PGSSLMODE="${PGSSLMODE:-require}"

  # Connectivity check
  run_psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -c "SELECT 1 AS ok;"

  run_pg_restore "$dump" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    --no-owner --no-acl --verbose
}

verify_managed() {
  eval "$(parse_db_url)"
  export PGPASSWORD
  export PGSSLMODE="${PGSSLMODE:-require}"

  echo "[verify] alembic_version:"
  run_psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
    -c "SELECT version_num FROM alembic_version;"

  echo "[verify] row counts:"
  run_psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -c \
    "SELECT 'users' AS tbl, COUNT(*)::bigint AS n FROM users UNION ALL SELECT 'games', COUNT(*)::bigint FROM games UNION ALL SELECT 'predictions', COUNT(*)::bigint FROM predictions;"
}

run_alembic_on_managed() {
  echo "[alembic] upgrade head against managed DATABASE_URL..."
  DATABASE_URL="$MANAGED_DATABASE_URL" "${COMPOSE[@]}" run --rm --no-deps \
    -e "DATABASE_URL=${MANAGED_DATABASE_URL}" api alembic upgrade head
}

print_cutover() {
  cat <<EOF

================================================================================
Cutover (manual — after verify passes)
================================================================================
1. Stop schedulers / cron writers:
     docker compose -f docker-compose.yml -f docker-compose.prod.yml stop prediction-scheduler 2>/dev/null || true

2. Update server .env DATABASE_URL:
     DATABASE_URL=${MANAGED_DATABASE_URL}

3. Redeploy API:
     ./scripts/deploy_api.sh

4. Smoke test:
     curl -fsS http://127.0.0.1:8000/ready
     curl -fsS https://api.octobetiq.com/health

5. After 24–72h soak, stop local postgres:
     docker compose stop postgres

6. Disable VPS pg_backup cron for Docker postgres; use provider backups instead.
   See docs/MANAGED_POSTGRES_MIGRATION.md

Rollback: restore DATABASE_URL to @postgres:5432/sportsprediction and ./scripts/deploy_api.sh
================================================================================
EOF
}

main() {
  preflight

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] preflight OK — would backup, restore, verify, alembic upgrade"
    print_cutover
    exit 0
  fi

  take_backup
  restore_to_managed
  verify_managed
  run_alembic_on_managed
  print_cutover
  echo "[done] migration data copy complete — complete cutover steps above"
}

main "$@"

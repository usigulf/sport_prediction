#!/usr/bin/env bash
# Staging restore drill (audit #17).
# Default: restore into sportsprediction_staging and smoke /health.
# DRY_RUN=1 prints steps without mutating.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN="${DRY_RUN:-0}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sport-prediction-postgres}"
STAGING_DB="${STAGING_DB:-sportsprediction_staging}"
DUMP="${DUMP:-}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8001/health}"
ALLOW_PROD_RESTORE="${ALLOW_PROD_RESTORE:-0}"

log() { printf '[restore-drill] %s\n' "$*"; }

if [[ -z "${DUMP}" ]]; then
  if [[ -d /root/backups ]]; then
    DUMP="$(ls -1t /root/backups/sportsprediction-*.dump 2>/dev/null | head -1 || true)"
  fi
fi

if [[ -z "${DUMP}" || ! -f "${DUMP}" ]]; then
  if [[ "${DRY_RUN}" == "1" ]]; then
    DUMP="/root/backups/sportsprediction-YYYYMMDD-HHMM.dump"
    log "DRY_RUN: using placeholder DUMP=${DUMP}"
  else
    log "FAIL: set DUMP=/path/to/sportsprediction-*.dump (or create one via ./scripts/run_pg_backup.sh)"
    exit 1
  fi
fi

if [[ "${STAGING_DB}" == "sportsprediction" && "${ALLOW_PROD_RESTORE}" != "1" ]]; then
  log "Refusing to restore into production DB name without ALLOW_PROD_RESTORE=1"
  exit 1
fi

START_TS="$(date +%s)"
log "dump=${DUMP}"
log "target_db=${STAGING_DB}"
log "health_url=${HEALTH_URL}"

run() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN: $*"
  else
    log "run: $*"
    eval "$@"
  fi
}

run "docker compose -f '${COMPOSE_FILE}' exec -T '${POSTGRES_SERVICE}' psql -U postgres -c \"SELECT 1\" >/dev/null"

# Ensure staging DB exists
run "docker compose -f '${COMPOSE_FILE}' exec -T '${POSTGRES_SERVICE}' psql -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname='${STAGING_DB}'\" | grep -q 1 || docker compose -f '${COMPOSE_FILE}' exec -T '${POSTGRES_SERVICE}' psql -U postgres -c \"CREATE DATABASE ${STAGING_DB};\""

run "docker compose -f '${COMPOSE_FILE}' exec -T '${POSTGRES_SERVICE}' psql -U postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${STAGING_DB}' AND pid <> pg_backend_pid();\""
run "docker compose -f '${COMPOSE_FILE}' exec -T '${POSTGRES_SERVICE}' psql -U postgres -c \"DROP DATABASE IF EXISTS ${STAGING_DB};\""
run "docker compose -f '${COMPOSE_FILE}' exec -T '${POSTGRES_SERVICE}' psql -U postgres -c \"CREATE DATABASE ${STAGING_DB};\""

run "docker cp '${DUMP}' '${POSTGRES_CONTAINER}:/tmp/restore_drill.dump'"
run "docker compose -f '${COMPOSE_FILE}' exec -T '${POSTGRES_SERVICE}' pg_restore -U postgres -d '${STAGING_DB}' --no-owner --no-acl /tmp/restore_drill.dump || true"
run "docker compose -f '${COMPOSE_FILE}' exec -T '${POSTGRES_SERVICE}' rm -f /tmp/restore_drill.dump"

if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN: would curl -fsS ${HEALTH_URL}"
else
  if curl -fsS --max-time 15 "${HEALTH_URL}" >/dev/null 2>&1; then
    log "health OK: ${HEALTH_URL}"
  else
    log "WARN: health check failed at ${HEALTH_URL} (DB restore may still be OK — start staging API via scripts/run_staging_local.sh)"
  fi
fi

END_TS="$(date +%s)"
ELAPSED_MIN=$(( (END_TS - START_TS) / 60 ))
log "elapsed_minutes=${ELAPSED_MIN}"
log "Record this in docs/RESTORE_DRILL.md drill log."
log "Done."

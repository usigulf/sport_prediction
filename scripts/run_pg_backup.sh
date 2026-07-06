#!/usr/bin/env bash
# Daily Postgres backup: local pg_dump + optional offsite copy.
#
# Cron (03:00 UTC):
#   0 3 * * * /root/sport_prediction/scripts/run_pg_backup.sh >>/var/log/pg_backup.log 2>&1
#
# Or install idempotently: ./scripts/setup_db_backup_cron.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${REPO_ROOT}"

_read_backup_env_var() {
  local key="$1" file="$2"
  [[ -f "${file}" ]] || return 0
  local val
  val="$( (grep -E "^${key}=" "${file}" || true) | tail -1 | cut -d= -f2- | tr -d '\r' )"
  if [[ -n "${val}" ]]; then
    export "${key}=${val}"
  fi
}

_load_backup_env() {
  local file
  for file in "${REPO_ROOT}/secrets/backup_offsite.env" "${REPO_ROOT}/.env.production" "${REPO_ROOT}/.env"; do
    _read_backup_env_var BACKUP_DIR "${file}"
    _read_backup_env_var RETENTION_DAYS "${file}"
    _read_backup_env_var PG_CONTAINER "${file}"
    _read_backup_env_var PG_DATABASE "${file}"
    _read_backup_env_var PG_USER "${file}"
    _read_backup_env_var OFFSITE_BACKUP_SCP_TARGET "${file}"
    _read_backup_env_var OFFSITE_BACKUP_S3_URI "${file}"
  done
}

_load_backup_env

"${REPO_ROOT}/scripts/pg_backup_docker.sh"
"${REPO_ROOT}/scripts/pg_backup_offsite_copy.sh"

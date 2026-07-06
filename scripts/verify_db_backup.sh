#!/usr/bin/env bash
# Verify local Postgres backups (and optional offsite copy) for cron/monitoring.
#
# Usage:
#   ./scripts/verify_db_backup.sh
#   OFFSITE_REQUIRED=1 ./scripts/verify_db_backup.sh   # fail if offsite not configured/recent
#
# Cron example (daily after backup, 03:30 UTC):
#   30 3 * * * /root/sport_prediction/scripts/verify_db_backup.sh >>/var/log/pg_backup_verify.log 2>&1

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -Is)"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-36}"
OFFSITE_MARKER="${OFFSITE_MARKER:-/var/log/pg_backup_offsite.last}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups}"

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
    _read_backup_env_var OFFSITE_BACKUP_SCP_TARGET "${file}"
    _read_backup_env_var OFFSITE_BACKUP_S3_URI "${file}"
  done
}

_load_backup_env

latest_dump() {
  ls -t "${BACKUP_DIR}"/sportsprediction-*.dump 2>/dev/null | head -1 || true
}

dump_age_hours() {
  local dump="$1"
  local now dump_epoch age_sec
  now="$(date +%s)"
  dump_epoch="$(date -r "${dump}" +%s)"
  age_sec=$((now - dump_epoch))
  echo $((age_sec / 3600))
}

LATEST="$(latest_dump)"
if [[ -z "${LATEST}" || ! -f "${LATEST}" ]]; then
  echo "${TS} FAIL no local dump in ${BACKUP_DIR}" >&2
  exit 1
fi

AGE_H="$(dump_age_hours "${LATEST}")"
if [[ "${AGE_H}" -gt "${MAX_AGE_HOURS}" ]]; then
  echo "${TS} FAIL local dump stale: ${LATEST} (${AGE_H}h old, max ${MAX_AGE_HOURS}h)" >&2
  exit 1
fi

echo "${TS} OK local ${LATEST} (${AGE_H}h old)"

OFFSITE_CONFIGURED=0
if [[ -n "${OFFSITE_BACKUP_SCP_TARGET:-}" || -n "${OFFSITE_BACKUP_S3_URI:-}" ]]; then
  OFFSITE_CONFIGURED=1
fi

if [[ "${OFFSITE_CONFIGURED}" -eq 0 ]]; then
  if [[ "${OFFSITE_REQUIRED:-0}" == "1" ]]; then
    echo "${TS} FAIL offsite not configured (set secrets/backup_offsite.env)" >&2
    exit 1
  fi
  echo "${TS} WARN offsite not configured (local backup only)"
  exit 0
fi

if [[ ! -f "${OFFSITE_MARKER}" ]]; then
  echo "${TS} FAIL offsite configured but no success marker ${OFFSITE_MARKER}" >&2
  exit 1
fi

MARKER_AGE_H="$(dump_age_hours "${OFFSITE_MARKER}")"
if [[ "${MARKER_AGE_H}" -gt "${MAX_AGE_HOURS}" ]]; then
  echo "${TS} FAIL offsite marker stale (${MARKER_AGE_H}h old)" >&2
  exit 1
fi

echo "${TS} OK offsite marker ${OFFSITE_MARKER} (${MARKER_AGE_H}h old)"
exit 0

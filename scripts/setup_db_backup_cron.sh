#!/usr/bin/env bash
# Install daily Postgres backup cron (03:00 UTC) if not already present.
# Usage: ./scripts/setup_db_backup_cron.sh [/path/to/repo]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ $# -ge 1 ]]; then
  REPO_ROOT="$(cd "$1" && pwd)"
fi

BACKUP_SCRIPT="${REPO_ROOT}/scripts/run_pg_backup.sh"
OFFSITE_SCRIPT="${REPO_ROOT}/scripts/pg_backup_offsite_copy.sh"
LOCAL_SCRIPT="${REPO_ROOT}/scripts/pg_backup_docker.sh"
CRON_LINE="0 3 * * * ${BACKUP_SCRIPT} >>/var/log/pg_backup.log 2>&1"

for script in "${LOCAL_SCRIPT}" "${OFFSITE_SCRIPT}" "${BACKUP_SCRIPT}"; do
  if [[ ! -f "${script}" ]]; then
    echo "Missing ${script}" >&2
    exit 1
  fi
  chmod +x "${script}"
done

if crontab -l 2>/dev/null | grep -Fq "run_pg_backup.sh"; then
  echo "DB backup cron already installed:"
  crontab -l | grep run_pg_backup.sh
  exit 0
fi

# Replace legacy /usr/local/bin/pg_backup_docker.sh cron if present.
TMP_CRON="$(mktemp)"
crontab -l 2>/dev/null | grep -v 'pg_backup_docker.sh' > "${TMP_CRON}" || true
{
  cat "${TMP_CRON}"
  echo ""
  echo "# Daily Postgres backup + optional offsite copy (03:00 UTC) — ${REPO_ROOT}"
  echo "${CRON_LINE}"
} | crontab -
rm -f "${TMP_CRON}"

echo "Installed DB backup cron:"
crontab -l | grep run_pg_backup.sh
echo ""
echo "Local dumps: \${BACKUP_DIR:-/root/backups}/sportsprediction-*.dump"
echo "Optional offsite: copy docs/backup_offsite.env.example -> secrets/backup_offsite.env"
echo ""
echo "Test now: ${BACKUP_SCRIPT}"

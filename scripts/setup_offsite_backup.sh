#!/usr/bin/env bash
# Configure offsite Postgres backup copy on the VPS (PH2-005).
#
# Non-interactive (DigitalOcean Spaces or AWS S3):
#   OFFSITE_BACKUP_S3_URI=s3://octobetiq-backups/db/ \
#   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
#   AWS_DEFAULT_REGION=nyc3 AWS_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com \
#   ./scripts/setup_offsite_backup.sh
#
# SCP to another host:
#   OFFSITE_BACKUP_SCP_TARGET=backup@host:/var/backups/octobetiq/ ./scripts/setup_offsite_backup.sh
#
# Check status only:
#   ./scripts/setup_offsite_backup.sh --check

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_FILE="${REPO_ROOT}/secrets/backup_offsite.env"
EXAMPLE_FILE="${REPO_ROOT}/docs/backup_offsite.env.example"
MODE="${1:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/setup_offsite_backup.sh [--check]

Configure secrets/backup_offsite.env and test offsite copy with the newest local dump.

S3 / DigitalOcean Spaces env vars:
  OFFSITE_BACKUP_S3_URI          s3://bucket/path/
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_DEFAULT_REGION             e.g. nyc3 for Spaces
  AWS_ENDPOINT_URL               e.g. https://nyc3.digitaloceanspaces.com

SCP env var:
  OFFSITE_BACKUP_SCP_TARGET      user@host:/path/

Set INSTALL_AWSCLI=1 to apt-install awscli when using S3.
EOF
}

if [[ "${MODE}" == "-h" || "${MODE}" == "--help" ]]; then
  usage
  exit 0
fi

install_awscli_if_needed() {
  if command -v aws >/dev/null 2>&1; then
    return 0
  fi
  if [[ "${INSTALL_AWSCLI:-0}" != "1" ]]; then
    echo "error: aws CLI not found; set INSTALL_AWSCLI=1 or apt install awscli" >&2
    exit 1
  fi
  echo "[offsite] Installing awscli..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq awscli
}

_load_existing_env() {
  [[ -f "${SECRETS_FILE}" ]] || return 0
  # shellcheck disable=SC1090
  set -a
  source "${SECRETS_FILE}"
  set +a
}

check_status() {
  echo "[offsite] secrets: ${SECRETS_FILE}"
  if [[ -f "${SECRETS_FILE}" ]]; then
    echo "[offsite] configured: yes"
    grep -E '^OFFSITE_BACKUP_' "${SECRETS_FILE}" | sed 's/=.*/=***/' || true
  else
    echo "[offsite] configured: no"
  fi
  if command -v aws >/dev/null 2>&1; then
    echo "[offsite] awscli: $(aws --version 2>&1)"
  else
    echo "[offsite] awscli: not installed"
  fi
  "${REPO_ROOT}/scripts/verify_db_backup.sh" || true
}

if [[ "${MODE}" == "--check" ]]; then
  check_status
  exit 0
fi

if [[ -z "${OFFSITE_BACKUP_S3_URI:-}" && -z "${OFFSITE_BACKUP_SCP_TARGET:-}" ]]; then
  _load_existing_env
fi

if [[ -z "${OFFSITE_BACKUP_S3_URI:-}" && -z "${OFFSITE_BACKUP_SCP_TARGET:-}" ]]; then
  echo "error: set OFFSITE_BACKUP_S3_URI or OFFSITE_BACKUP_SCP_TARGET" >&2
  usage >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/secrets"
chmod 700 "${REPO_ROOT}/secrets"

{
  echo "# Offsite Postgres backup — generated $(date -Is)"
  echo "# See docs/DATABASE_BACKUP.md"
  [[ -n "${BACKUP_DIR:-}" ]] && echo "BACKUP_DIR=${BACKUP_DIR}"
  [[ -n "${OFFSITE_BACKUP_SCP_TARGET:-}" ]] && echo "OFFSITE_BACKUP_SCP_TARGET=${OFFSITE_BACKUP_SCP_TARGET}"
  [[ -n "${OFFSITE_BACKUP_S3_URI:-}" ]] && echo "OFFSITE_BACKUP_S3_URI=${OFFSITE_BACKUP_S3_URI}"
  [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && echo "AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}"
  [[ -n "${AWS_SECRET_ACCESS_KEY:-}" ]] && echo "AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}"
  [[ -n "${AWS_DEFAULT_REGION:-}" ]] && echo "AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}"
  [[ -n "${AWS_ENDPOINT_URL:-}" ]] && echo "AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL}"
} > "${SECRETS_FILE}"
chmod 600 "${SECRETS_FILE}"
echo "[offsite] wrote ${SECRETS_FILE}"

if [[ -n "${OFFSITE_BACKUP_S3_URI:-}" ]]; then
  install_awscli_if_needed
  if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
    echo "error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required for S3" >&2
    exit 1
  fi
fi

echo "[offsite] testing copy with newest local dump..."
# shellcheck disable=SC1090
set -a
source "${SECRETS_FILE}"
set +a
"${REPO_ROOT}/scripts/pg_backup_offsite_copy.sh"

echo "[offsite] verify:"
OFFSITE_REQUIRED=1 "${REPO_ROOT}/scripts/verify_db_backup.sh"
echo "[offsite] success"

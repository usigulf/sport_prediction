#!/usr/bin/env bash
# Copy the newest local Postgres dump to an offsite destination.
#
# Configure ONE of:
#   OFFSITE_BACKUP_SCP_TARGET=user@backup-host:/var/backups/octobetiq/
#   OFFSITE_BACKUP_S3_URI=s3://your-bucket/octobetiq/db/
#
# Optional S3-compatible endpoint (DigitalOcean Spaces):
#   AWS_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com
#
# If unset, exits 0 with a skip message (local backup-only is still OK).
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/root/backups}"
OFFSITE_MARKER="${OFFSITE_MARKER:-/var/log/pg_backup_offsite.last}"

latest_dump() {
  ls -t "${BACKUP_DIR}"/sportsprediction-*.dump 2>/dev/null | head -1 || true
}

LATEST="$(latest_dump)"
if [[ -z "${LATEST}" || ! -f "${LATEST}" ]]; then
  echo "$(date -Is) warn: no backup file found in ${BACKUP_DIR}" >&2
  exit 0
fi

BASENAME="$(basename "${LATEST}")"

if [[ -n "${OFFSITE_BACKUP_S3_URI:-}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "error: aws CLI required for OFFSITE_BACKUP_S3_URI" >&2
    exit 1
  fi
  DEST="${OFFSITE_BACKUP_S3_URI%/}/${BASENAME}"
  echo "$(date -Is) copying ${BASENAME} -> ${DEST}"
  AWS_ARGS=()
  if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
    AWS_ARGS+=(--endpoint-url "${AWS_ENDPOINT_URL}")
  fi
  aws s3 cp "${AWS_ARGS[@]}" "${LATEST}" "${DEST}"
  date -Is > "${OFFSITE_MARKER}"
  echo "$(date -Is) ok offsite s3 ${BASENAME}"
  exit 0
fi

if [[ -n "${OFFSITE_BACKUP_SCP_TARGET:-}" ]]; then
  TARGET="${OFFSITE_BACKUP_SCP_TARGET%/}/${BASENAME}"
  echo "$(date -Is) copying ${BASENAME} -> ${TARGET}"
  scp -o BatchMode=yes -o ConnectTimeout=30 "${LATEST}" "${TARGET}"
  date -Is > "${OFFSITE_MARKER}"
  echo "$(date -Is) ok offsite scp ${BASENAME}"
  exit 0
fi

echo "$(date -Is) skip offsite copy (OFFSITE_BACKUP_SCP_TARGET / OFFSITE_BACKUP_S3_URI unset)"
exit 0

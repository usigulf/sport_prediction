#!/usr/bin/env bash
# Single canonical Postgres backup for Docker Compose deploy (TimescaleDB image).
# Run from cron as root, e.g.:
#   0 3 * * * /path/to/sport_prediction/scripts/pg_backup_docker.sh >>/var/log/pg_backup.log 2>&1
#
# Env (optional):
#   PG_CONTAINER   default: sport-prediction-postgres
#   PG_DATABASE    default: sportsprediction
#   PG_USER        default: postgres
#   BACKUP_DIR     default: /root/backups
#   RETENTION_DAYS default: 14 (0 = skip pruning)

set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-sport-prediction-postgres}"
PG_DATABASE="${PG_DATABASE:-sportsprediction}"
PG_USER="${PG_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

DOCKER="${DOCKER:-$(command -v docker || true)}"
if [[ -z "$DOCKER" || ! -x "$DOCKER" ]]; then
  DOCKER="/usr/bin/docker"
fi

if [[ ! -x "$DOCKER" ]]; then
  echo "error: docker not found" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TS="$(date +%Y%m%d-%H%M)"
TMP_IN_CONTAINER="/tmp/sportsprediction-${TS}.dump"
OUT_FILE="${BACKUP_DIR}/sportsprediction-${TS}.dump"

echo "$(date -Is) starting backup -> ${OUT_FILE}"

"$DOCKER" exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DATABASE" -Fc -f "$TMP_IN_CONTAINER"
"$DOCKER" cp "${PG_CONTAINER}:${TMP_IN_CONTAINER}" "$OUT_FILE"
"$DOCKER" exec "$PG_CONTAINER" rm -f "$TMP_IN_CONTAINER"

echo "$(date -Is) ok $(du -h "$OUT_FILE" | awk '{print $1}')"

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -name 'sportsprediction-*.dump' -type f -mtime "+${RETENTION_DAYS}" -print -delete || true
fi

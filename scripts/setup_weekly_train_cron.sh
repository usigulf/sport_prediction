#!/usr/bin/env bash
# Install weekly ML retrain cron (Sunday 05:15 UTC) if not already present.
# Usage: ./scripts/setup_weekly_train_cron.sh [/path/to/repo]
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ $# -ge 1 ]]; then
  REPO_ROOT="$(cd "$1" && pwd)"
fi
CRON_LINE="15 5 * * 0 ${REPO_ROOT}/scripts/cron/internal_train_model.sh >> /tmp/sport-prediction-cron.log 2>&1"
TRAIN_SCRIPT="${REPO_ROOT}/scripts/cron/internal_train_model.sh"

if [[ ! -f "${TRAIN_SCRIPT}" ]]; then
  echo "Missing ${TRAIN_SCRIPT}" >&2
  exit 1
fi
chmod +x "${TRAIN_SCRIPT}"

if crontab -l 2>/dev/null | grep -Fq "internal_train_model.sh"; then
  echo "Weekly train cron already installed:"
  crontab -l | grep internal_train_model.sh
  exit 0
fi

( crontab -l 2>/dev/null || true
  echo ""
  echo "# Weekly ML retrain (Sunday 05:15 UTC) — ${REPO_ROOT}"
  echo "${CRON_LINE}"
) | crontab -

echo "Installed weekly train cron:"
crontab -l | grep internal_train_model.sh
echo ""
echo "Optional env in .env.production:"
echo "  MODEL_TRAIN_MIN_GAMES=60"
echo "  MODEL_TRAIN_FORCE=false"
echo "  MODEL_TRAIN_REFRESH_PREDICTIONS=true   # run predictions job after train"
echo ""
echo "Test now: ${TRAIN_SCRIPT}"

#!/usr/bin/env bash
# Run prediction job against the API (for host crontab). Loads repo .env.
#
# Usage:
#   cd /path/to/sport_prediction && ./scripts/cron_predict.sh
#   ./scripts/cron_predict.sh '{"force": false}'
#
# Crontab example (every 15 min):
#   */15 * * * * cd /root/sport_prediction && /usr/bin/env bash ./scripts/cron_predict.sh >> /var/log/octobet-predictions.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a
[ -f .env ] && . ./.env
set +a
: "${PUSH_CRON_SECRET:?set PUSH_CRON_SECRET in .env}"
API_URL="${API_URL:-http://127.0.0.1:8000}"
BODY="${1:-{}}"
curl -fsS -X POST "${API_URL%/}/internal/predictions/run" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  -d "$BODY"
echo

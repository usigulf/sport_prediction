#!/usr/bin/env bash
# POST /internal/historical-backfill/run — M-07 prior-season game ingest.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
# shellcheck source=scripts/cron/_load_cron_env.sh
source "${REPO_ROOT}/scripts/cron/_load_cron_env.sh"
load_cron_env "$REPO_ROOT"
: "${PUSH_CRON_SECRET:?PUSH_CRON_SECRET is not set (add to .env.production)}"
BASE="${API_INTERNAL_URL:-http://127.0.0.1:8000}"
SEASONS_BACK="${HISTORICAL_BACKFILL_SEASONS_BACK:-2}"
MIN_DECISIVE="${HISTORICAL_BACKFILL_MIN_DECISIVE:-500}"
RUN_PREDICTIONS="${HISTORICAL_BACKFILL_RUN_PREDICTIONS:-false}"
FINISHED_DAYS="${HISTORICAL_BACKFILL_FINISHED_DAYS:-365}"
curl -fsS -X POST \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"seasons_back\": ${SEASONS_BACK}, \"min_decisive_target\": ${MIN_DECISIVE}, \"run_predictions\": ${RUN_PREDICTIONS}, \"include_recent_finished_days\": ${FINISHED_DAYS}}" \
  "${BASE%/}/internal/historical-backfill/run"

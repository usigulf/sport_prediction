#!/usr/bin/env bash
# POST /internal/predictions/run — use from crontab every 15–60 minutes (no force).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi
if [[ -f .env.production ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env.production
  set +a
fi
: "${PUSH_CRON_SECRET:?PUSH_CRON_SECRET is not set (add to .env)}"
BASE="${API_INTERNAL_URL:-http://127.0.0.1:8000}"
# Optional in .env: PREDICTION_INCLUDE_FINISHED_DAYS=14, PREDICTION_LEAGUES=premier_league
export PREDICTION_INCLUDE_FINISHED_DAYS="${PREDICTION_INCLUDE_FINISHED_DAYS:-0}"
export PREDICTION_LEAGUES="${PREDICTION_LEAGUES:-}"
BODY=$(python3 <<'PY'
import json, os
body = {"include_recent_finished_days": int(os.environ.get("PREDICTION_INCLUDE_FINISHED_DAYS") or 0)}
leagues = [x.strip() for x in (os.environ.get("PREDICTION_LEAGUES") or "").split(",") if x.strip()]
if leagues:
    body["leagues"] = leagues
print(json.dumps(body))
PY
)
curl -fsS -X POST \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d "${BODY}" \
  "${BASE%/}/internal/predictions/run"

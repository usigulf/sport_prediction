#!/usr/bin/env bash
# POST /internal/soccer/sync-schedules — use from crontab a few times per day.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
# shellcheck source=scripts/cron/_load_cron_env.sh
source "${REPO_ROOT}/scripts/cron/_load_cron_env.sh"
load_cron_env "$REPO_ROOT"
: "${PUSH_CRON_SECRET:?PUSH_CRON_SECRET is not set (add to .env.production)}"
BASE="${API_INTERNAL_URL:-http://127.0.0.1:8000}"
curl -fsS -X POST \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  "${BASE%/}/internal/soccer/sync-schedules"

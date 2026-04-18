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
curl -fsS -X POST \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${BASE%/}/internal/predictions/run"

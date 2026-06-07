#!/usr/bin/env bash
# POST /internal/push-triggers/run — game reminders + high-confidence pick pushes.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

_read_env_var() {
  local key="$1" file="$2"
  [[ -f "$file" ]] || return 0
  local val
  val="$( (grep -E "^${key}=" "$file" || true) | tail -1 | cut -d= -f2- | tr -d '\r' )"
  if [[ -n "$val" ]]; then
    export "${key}=${val}"
  fi
}

for file in .env.production .env; do
  _read_env_var PUSH_CRON_SECRET "$file"
  _read_env_var API_INTERNAL_URL "$file"
done

: "${PUSH_CRON_SECRET:?PUSH_CRON_SECRET is not set (add to .env.production)}"
BASE="${API_INTERNAL_URL:-http://127.0.0.1:8000}"
curl -fsS -X POST \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${BASE%/}/internal/push-triggers/run"

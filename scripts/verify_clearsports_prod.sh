#!/usr/bin/env bash
# Verify ClearSports key and GET /internal/health/clearsports (prod or staging).
#
# Usage:
#   ./scripts/verify_clearsports_prod.sh
#   ./scripts/verify_clearsports_prod.sh /path/to/.env.production
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="${1:-$REPO_ROOT/.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No env file at: $ENV_FILE"
  exit 1
fi

_read_env_var() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' || true
}

CLEARSPORTS_API_KEY="${CLEARSPORTS_API_KEY:-$(_read_env_var CLEARSPORTS_API_KEY)}"
PUSH_CRON_SECRET="${PUSH_CRON_SECRET:-$(_read_env_var PUSH_CRON_SECRET)}"
CLEARSPORTS_SOCCER_SEASON_PREMIER_LEAGUE="${CLEARSPORTS_SOCCER_SEASON_PREMIER_LEAGUE:-$(_read_env_var CLEARSPORTS_SOCCER_SEASON_PREMIER_LEAGUE)}"

mask() {
  local s="${1:-}"
  local n=${#s}
  if [[ "$n" -le 8 ]]; then
    echo "(length $n, not shown)"
  else
    echo "${s:0:4}…${s: -4} (length $n)"
  fi
}

echo "=== Env file: $ENV_FILE ==="
if [[ -z "${CLEARSPORTS_API_KEY:-}" ]]; then
  echo "FAIL CLEARSPORTS_API_KEY is empty"
  exit 1
fi
echo "OK  CLEARSPORTS_API_KEY $(mask "$CLEARSPORTS_API_KEY")"

if [[ -z "${PUSH_CRON_SECRET// }" ]]; then
  echo "FAIL PUSH_CRON_SECRET is empty"
  exit 1
fi
echo "OK  PUSH_CRON_SECRET $(mask "$PUSH_CRON_SECRET")"

echo ""
echo "Optional season override: CLEARSPORTS_SOCCER_SEASON_PREMIER_LEAGUE=${CLEARSPORTS_SOCCER_SEASON_PREMIER_LEAGUE:-(auto)}"

echo ""
BASE="${VERIFY_API_BASE:-http://127.0.0.1:8000}"
BASE="${BASE%/}"
echo "=== GET ${BASE}/internal/health/clearsports ==="
code=$(curl -sS -o /tmp/clearsports_health.json -w "%{http_code}" \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  "${BASE}/internal/health/clearsports") || true
echo "HTTP $code"
if [[ -f /tmp/clearsports_health.json ]]; then
  python3 -m json.tool /tmp/clearsports_health.json 2>/dev/null || cat /tmp/clearsports_health.json
  echo ""
  python3 <<'PY'
import json
with open("/tmp/clearsports_health.json") as f:
    j = json.load(f)
if j.get("clearsports_ok"):
    print("OK  ClearSports API key accepted.")
else:
    print("FAIL ClearSports probe failed — check key and CLEARSPORTS_API_BASE_URL.")
if j.get("soccer_provider") == "clearsports":
    if j.get("clearsports_soccer_ok"):
        print("OK  EPL games feed returned data.")
    else:
        print("WARN EPL games count 0 — try CLEARSPORTS_SOCCER_SEASON_PREMIER_LEAGUE=2024-2025 (or current season)")
PY
fi

if [[ "$code" != "200" ]]; then
  echo "FAIL Health endpoint did not return 200"
  exit 1
fi

echo ""
echo "=== Sync fixtures (POST /internal/soccer/sync-schedules) ==="
echo "  curl -sS -X POST -H \"X-Cron-Secret: \$PUSH_CRON_SECRET\" \"${BASE}/internal/soccer/sync-schedules\""

#!/usr/bin/env bash
# Verify Sportradar + soccer season config and GET /internal/health/sportradar (prod or staging).
#
# Usage (from repo root, on the host where API runs or can reach it):
#   ./scripts/verify_sportradar_prod.sh                    # loads .env.production
#   ./scripts/verify_sportradar_prod.sh /path/to/.env      # custom env file
#
# Optional: VERIFY_API_BASE=https://your-api.example.com  (default http://127.0.0.1:8000)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="${1:-$REPO_ROOT/.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No env file at: $ENV_FILE"
  echo "Create it on the server or pass: $0 /path/to/.env.production"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

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
if [[ -z "${SPORTRADAR_API_KEY// }" ]]; then
  echo "FAIL SPORTRADAR_API_KEY is empty — Sportradar calls will not work."
  exit 1
fi
echo "OK  SPORTRADAR_API_KEY $(mask "$SPORTRADAR_API_KEY")"

if [[ -z "${PUSH_CRON_SECRET// }" ]]; then
  echo "FAIL PUSH_CRON_SECRET is empty — cannot call /internal/* health or cron routes."
  exit 1
fi
echo "OK  PUSH_CRON_SECRET $(mask "$PUSH_CRON_SECRET")"

echo ""
echo "=== Soccer season ids (must match Sportradar Global Soccer v4 for your access level) ==="
SOCCER_VARS=(
  SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE
  SPORTRADAR_SOCCER_SEASON_CHAMPIONS_LEAGUE
  SPORTRADAR_SOCCER_SEASON_LA_LIGA
  SPORTRADAR_SOCCER_SEASON_SERIE_A
  SPORTRADAR_SOCCER_SEASON_BUNDESLIGA
  SPORTRADAR_SOCCER_SEASON_MLS
)
any_soccer=0
for v in "${SOCCER_VARS[@]}"; do
  val="${!v:-}"
  if [[ -n "${val// }" ]]; then
    echo "OK  $v=$val"
    any_soccer=1
  else
    echo "     $v (unset)"
  fi
done
if [[ "$any_soccer" -eq 0 ]]; then
  echo "WARN No SPORTRADAR_SOCCER_SEASON_* set — soccer schedule sync does nothing; soccer model features fall back to synthetic unless you set at least one season id."
fi

echo ""
echo "=== GET ${VERIFY_API_BASE:-http://127.0.0.1:8000}/internal/health/sportradar ==="
BASE="${VERIFY_API_BASE:-http://127.0.0.1:8000}"
BASE="${BASE%/}"
code=$(curl -sS -o /tmp/sportradar_health.json -w "%{http_code}" \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  "${BASE}/internal/health/sportradar") || true
echo "HTTP $code"
if [[ -f /tmp/sportradar_health.json ]]; then
  python3 -m json.tool /tmp/sportradar_health.json 2>/dev/null || cat /tmp/sportradar_health.json
  echo ""
  python3 <<'PY'
import json
with open("/tmp/sportradar_health.json") as f:
    j = json.load(f)
soc_ok = j.get("soccer_standings_ok")
soc_cfg = j.get("soccer_configured")
if soc_cfg is True and soc_ok is True:
    print("OK  All configured soccer season standings probes succeeded.")
elif not soc_cfg:
    print("INFO No soccer seasons configured (see soccer_probes in JSON above).")
elif soc_ok is False:
    print("FAIL At least one soccer standings probe failed — check season ids and SPORTRADAR_ACCESS_LEVEL (trial vs production).")
PY
fi

if [[ "$code" != "200" ]]; then
  echo "FAIL Health endpoint did not return 200 (wrong PUSH_CRON_SECRET, wrong URL, or API down)."
  exit 1
fi

echo ""
echo "=== Optional: trigger prediction job (POST /internal/predictions/run) ==="
echo "To run once after deploy (same secret, empty JSON body):"
echo "  curl -sS -X POST -H \"X-Cron-Secret: \$PUSH_CRON_SECRET\" -H \"Content-Type: application/json\" -d '{}' \"${BASE}/internal/predictions/run\""
echo ""
echo "=== Team name / abbreviation matching ==="
echo "Soccer features use Sportradar standings rows matched to your DB teams by abbreviation then name."
echo "If health is OK but picks look random, run POST /internal/soccer/sync-schedules then predictions/run,"
echo "or compare teams.abbreviation / teams.name to Sportradar competitor fields for that league."

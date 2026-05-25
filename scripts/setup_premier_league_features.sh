#!/usr/bin/env bash
#
# Step-by-step helper: Premier League → real model features (Sportradar → DB → predictions).
#
# Run on a host that can reach the API and has your env file (same machine as Docker is fine):
#   cd /path/to/sport_prediction
#   chmod +x scripts/setup_premier_league_features.sh
#   VERIFY_API_BASE=http://127.0.0.1:8000 ./scripts/setup_premier_league_features.sh .env
#
# What this does: prints the checklist, then calls health → soccer sync → predictions run.
# What you must do first: set SPORTRADAR_* and PUSH_CRON_SECRET in the env file (see Step 1).
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$REPO_ROOT/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Usage: VERIFY_API_BASE=http://127.0.0.1:8000 $0 /path/to/.env"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

BASE="${VERIFY_API_BASE:-${API_INTERNAL_URL:-http://127.0.0.1:8000}}"
BASE="${BASE%/}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Premier League — real features (checklist + automated curls)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Step 1 — Env (required for PL)"
echo "  SPORTRADAR_API_KEY           = non-empty"
echo "  SPORTRADAR_ACCESS_LEVEL      = trial or production (must match your Sportradar key)"
echo "  SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE = sr:season:… from Sportradar Global Soccer v4"
echo "  PUSH_CRON_SECRET             = non-empty (protects /internal/*)"
echo ""
echo "  Tip: If UCL health fails, comment out SPORTRADAR_SOCCER_SEASON_CHAMPIONS_LEAGUE until fixed"
echo "       so /internal/health/sportradar shows soccer_standings_ok true for PL-only."
echo ""
echo "Step 2 — Restart the API container/process after changing .env."
echo ""
echo "Step 3 — Verify Sportradar can fetch PL standings (read-only):"
curl -sS -o /tmp/pl_health.json -w "  HTTP %{http_code}\n" \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  "$BASE/internal/health/sportradar" || true
if [[ -f /tmp/pl_health.json ]]; then
  python3 -m json.tool /tmp/pl_health.json 2>/dev/null | head -40 || cat /tmp/pl_health.json
fi
echo ""
echo "Step 4 — Import PL fixtures + team_standings from Sportradar (writes DB):"
curl -sS -X POST -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  "$BASE/internal/soccer/sync-schedules" | python3 -m json.tool || true
echo ""
echo "Step 5 — Regenerate predictions (uses PL standings + recent finished games in DB):"
curl -sS -X POST \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$BASE/internal/predictions/run" | python3 -m json.tool || true
echo ""
echo "Step 6 — Spot-check the public API (no secret):"
curl -sS "$BASE/api/v1/games/upcoming?leagues=premier_league&limit=5" | python3 -c "import json,sys; d=json.load(sys.stdin); print('total', d.get('total'), 'sample', [g.get('home_team',{}).get('name') for g in (d.get('games') or [])[:3]])" 2>/dev/null || echo "  (adjust VERIFY_API_BASE if this fails — path is /api/v1/games/upcoming)"
echo ""
echo "Step 7 — Mobile app"
echo "  EXPO_PUBLIC_API_URL (or equivalent) must point at this same API."
echo "  Soccer hub: use ← → until the week strip includes your match day, then pick that day."
echo ""
echo "Done. If Step 3 PL probe is ok but Step 6 total is 0, re-check season id and re-run Step 4."

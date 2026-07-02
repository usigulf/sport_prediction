#!/usr/bin/env bash
# Pre–App Store Connect smoke test (public API + optional internal cron routes).
#
# Usage:
#   ./scripts/verify_pre_asc_prod.sh
#   VERIFY_API_PUBLIC=https://api.octobetiq.com/api/v1 ./scripts/verify_pre_asc_prod.sh
#   ./scripts/verify_pre_asc_prod.sh /path/to/.env.production   # also runs internal checks
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

API_PUBLIC="${VERIFY_API_PUBLIC:-https://api.octobetiq.com/api/v1}"
API_PUBLIC="${API_PUBLIC%/}"
API_ORIGIN="${API_PUBLIC%/api/v1}"
DEMO_EMAIL="${VERIFY_DEMO_EMAIL:-appstore-review@octobetiq.com}"
DEMO_PASSWORD="${VERIFY_DEMO_PASSWORD:-AppReview2026!}"

failures=0
ok() { echo "OK  $*"; }
warn() { echo "WARN $*"; }
fail() { echo "FAIL $*"; failures=$((failures + 1)); }

echo "=== Pre-ASC production verify ==="
echo "Public API: $API_PUBLIC"
echo ""

echo "--- /health ---"
if curl -fsS "${API_ORIGIN}/health" >/dev/null 2>&1; then
  ok "API health"
else
  fail "API health (${API_ORIGIN}/health)"
fi

echo "--- Legal pages ---"
for url in "https://octobetiq.com/support" "https://octobetiq.com/privacy"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" -L "$url" || echo "000")
  if [[ "$code" =~ ^2 ]]; then
    ok "$url → HTTP $code"
  else
    fail "$url → HTTP $code (expected 2xx)"
  fi
done

echo "--- Model readiness ---"
curl -fsS "${API_PUBLIC}/stats/model" -o /tmp/pre_asc_model.json
python3 <<'PY' || failures=$((failures + 1))
import json, sys
with open("/tmp/pre_asc_model.json") as f:
    j = json.load(f)
if j.get("publish_ready"):
    print(f"OK  stats/model publish_ready=true status={j.get('status')} games={j.get('games')}")
else:
    print("FAIL stats/model publish_ready=false", j)
    sys.exit(1)
PY

echo "--- Calibration ---"
curl -fsS "${API_PUBLIC}/stats/calibration" -o /tmp/pre_asc_cal.json
python3 <<'PY' || failures=$((failures + 1))
import json, sys
with open("/tmp/pre_asc_cal.json") as f:
    j = json.load(f)
scored = j.get("total_scored", 0)
met = j.get("min_sample_met", False)
if met and scored >= 100:
    print(f"OK  calibration total_scored={scored} min_sample_met=true")
else:
    print("FAIL calibration", j)
    sys.exit(1)
PY

echo "--- Demo account login ---"
login_code=$(curl -sS -o /tmp/pre_asc_login.json -w "%{http_code}" \
  -X POST "${API_PUBLIC}/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${DEMO_EMAIL}&password=${DEMO_PASSWORD}" || echo "000")
if [[ "$login_code" == "200" ]] && python3 -c "import json; j=json.load(open('/tmp/pre_asc_login.json')); exit(0 if j.get('access_token') else 1)" 2>/dev/null; then
  ok "demo login ${DEMO_EMAIL}"
else
  fail "demo login HTTP $login_code"
  cat /tmp/pre_asc_login.json 2>/dev/null || true
fi

ENV_FILE="${1:-}"
if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  echo "--- Internal (from $ENV_FILE) ---"
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
  BASE="${VERIFY_API_BASE:-http://127.0.0.1:8000}"
  BASE="${BASE%/}"
  if [[ -z "${PUSH_CRON_SECRET// }" ]]; then
    warn "PUSH_CRON_SECRET empty — skipping internal checks"
  else
    echo "Push triggers cron smoke"
    push_json=$(curl -fsS -X POST \
      -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
      -H "Content-Type: application/json" \
      -d '{}' \
      "${BASE}/internal/push-triggers/run" -o /tmp/pre_asc_push.json)
    python3 <<'PY' || failures=$((failures + 1))
import json
with open("/tmp/pre_asc_push.json") as f:
    j = json.load(f)
keys = ("game_reminders_sent", "high_confidence_picks_sent", "post_game_results_sent")
if all(k in j for k in keys):
    print("OK  push-triggers", {k: j[k] for k in keys})
else:
    print("FAIL push-triggers response", j)
    raise SystemExit(1)
PY

    if [[ -n "${CLEARSPORTS_API_KEY:-}" ]]; then
      "$REPO_ROOT/scripts/verify_clearsports_prod.sh" "$ENV_FILE" || failures=$((failures + 1))
    else
      warn "CLEARSPORTS_API_KEY unset in env file"
    fi
  fi
else
  echo ""
  echo "Tip: pass .env.production path to also verify push-triggers + ClearSports on the API host."
fi

echo ""
if [[ "$failures" -eq 0 ]]; then
  echo "=== All checks passed ==="
  exit 0
fi
echo "=== $failures check(s) failed ==="
exit 1

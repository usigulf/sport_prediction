#!/usr/bin/env bash
# Soccer beta launch checklist — run on the VPS after cloning the repo.
#
# Usage:
#   cp .env.production.example .env.production   # fill secrets
#   cp .env.production.example .env              # same POSTGRES_PASSWORD + JWT for compose
#   ./scripts/launch_soccer_beta.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

fail() { echo -e "${RED}FAIL${NC} $*"; exit 1; }
ok() { echo -e "${GREEN}OK${NC} $*"; }

echo "=== octobetiQ soccer beta — server checklist ==="
echo ""

# --- env files ---
[[ -f .env.production ]] || fail "Missing .env.production — copy from .env.production.example and fill secrets"
[[ -f .env ]] || echo "WARN: Missing project .env (compose substitution); using .env.production via compose env_file only"

set -a
# shellcheck source=/dev/null
source .env.production
set +a

[[ -n "${JWT_SECRET// }" ]] || fail "JWT_SECRET empty"
[[ ${#JWT_SECRET} -ge 32 ]] || fail "JWT_SECRET must be at least 32 characters"
[[ -n "${REDIS_URL// }" ]] || fail "REDIS_URL empty"
[[ -n "${PUSH_CRON_SECRET// }" ]] || fail "PUSH_CRON_SECRET empty"
has_cs=0
has_sr=0
[[ -n "${CLEARSPORTS_API_KEY// }" ]] && has_cs=1
[[ -n "${SPORTRADAR_API_KEY// }" ]] && has_sr=1
if [[ "$has_cs" -eq 0 && "$has_sr" -eq 0 ]]; then
  fail "Set CLEARSPORTS_API_KEY (recommended) or SPORTRADAR_API_KEY for soccer fixtures"
fi
if [[ "$has_cs" -eq 1 ]]; then
  ok "Soccer data provider: ClearSports"
  # Season label optional — defaults to current European season (e.g. 2024-2025)
elif [[ "$has_sr" -eq 1 ]]; then
  ok "Soccer data provider: Sportradar"
  [[ -n "${SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE// }" ]] || fail "Set SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE at minimum"
fi

ok "Required env vars present"

# --- docker ---
if ! command -v docker >/dev/null 2>&1; then
  fail "docker not installed"
fi

echo ""
echo "=== Starting stack (prod overlay) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build postgres redis api

echo ""
echo "=== Migrations (first deploy or after schema changes) ==="
docker compose exec -T api alembic upgrade head || echo "WARN: alembic failed — run manually: docker compose exec api alembic upgrade head"

echo ""
echo "=== Health ==="
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    ok "/health"
    break
  fi
  sleep 2
done
curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1 || fail "/health not responding"

curl -fsS "http://127.0.0.1:8000/ready" | head -c 200
echo ""

echo ""
echo "=== Soccer provider health + sync ==="
if [[ "$has_cs" -eq 1 && -x scripts/verify_clearsports_prod.sh ]]; then
  VERIFY_API_BASE=http://127.0.0.1:8000 ./scripts/verify_clearsports_prod.sh .env.production || true
elif [[ "$has_sr" -eq 1 && -x scripts/verify_sportradar_prod.sh ]]; then
  VERIFY_API_BASE=http://127.0.0.1:8000 ./scripts/verify_sportradar_prod.sh .env.production || true
fi
if [[ -x scripts/setup_premier_league_features.sh ]]; then
  VERIFY_API_BASE=http://127.0.0.1:8000 ./scripts/setup_premier_league_features.sh .env.production || true
fi

echo ""
echo "=== Cron (host) ==="
echo "Install jobs from deploy/crontab.example (predictions + soccer sync)."
echo "  crontab -e"

echo ""
echo "=== Nginx ==="
echo "Ensure snippets from deploy/ are included (api.octobetiq.com → 127.0.0.1:8000)."

echo ""
echo "=== Mobile (run on your Mac, not the server) ==="
cat <<'MOBILE'

  cd mobile
  cp .env.example .env   # set EXPO_PUBLIC_API_URL=https://api.octobetiq.com/api/v1

  # AdMob production (create units in AdMob console first):
  #   EXPO_PUBLIC_ADMOB_PRODUCTION=true
  #   EXPO_PUBLIC_ADMOB_BANNER_IOS=...
  #   (see mobile/.env.example)

  # EAS secrets (recommended for production ad unit IDs):
  #   eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_PRODUCTION --value true
  #   eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_IOS --value ca-app-pub-...

  eas build --platform ios --profile production
  eas build --platform android --profile production
  # eas submit --platform ios --profile production

MOBILE

ok "Server bootstrap complete. Build mobile with EAS when env is ready."

#!/usr/bin/env bash
# Deploy staging API (api-staging on :8001). See docs/STAGING_ENVIRONMENT.md.
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/sport_prediction}"
cd "$ROOT_DIR"

COMPOSE=(docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml)
STAGING_PORT="${STAGING_PORT:-8001}"

if [[ ! -f "${ROOT_DIR}/.env.staging" ]]; then
  echo "[staging-deploy] .env.staging missing — run ./scripts/setup_staging_env.sh first" >&2
  exit 1
fi

echo "[staging-deploy] Ensuring staging database..."
"${ROOT_DIR}/scripts/ensure_staging_database.sh"

echo "[staging-deploy] Pulling latest code..."
git pull

echo "[staging-deploy] Building staging API image..."
"${COMPOSE[@]}" build api-staging

echo "[staging-deploy] Running migrations on sportsprediction_staging..."
"${COMPOSE[@]}" run --rm --no-deps api-staging alembic upgrade head

echo "[staging-deploy] Starting api-staging..."
"${COMPOSE[@]}" up -d api-staging

echo "[staging-deploy] Waiting for healthy container..."
for _ in {1..45}; do
  if "${COMPOSE[@]}" ps api-staging | python3 -c 'import sys; s=sys.stdin.read().lower(); raise SystemExit(0 if "(healthy)" in s or " healthy" in s else 1)'; then
    break
  fi
  sleep 2
done

echo "[staging-deploy] API status:"
"${COMPOSE[@]}" ps api-staging

echo "[staging-deploy] Verifying /health on 127.0.0.1:${STAGING_PORT}..."
ok=0
for _ in {1..45}; do
  if curl -fsS "http://127.0.0.1:${STAGING_PORT}/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" -ne 1 ]]; then
  echo "[staging-deploy] ERROR: /health failed."
  "${COMPOSE[@]}" logs --tail 80 api-staging || true
  exit 1
fi

curl -fsS "http://127.0.0.1:${STAGING_PORT}/health" | python3 -m json.tool
echo "[staging-deploy] Success."

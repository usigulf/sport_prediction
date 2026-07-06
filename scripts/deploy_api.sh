#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/deploy_api.sh
# Runs a safe API deploy on the droplet host:
# - pulls latest main
# - builds API image
# - runs alembic upgrade head (fails deploy on migration error)
# - restarts API container
# - verifies container health and /health response

ROOT_DIR="${ROOT_DIR:-$HOME/sport_prediction}"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

echo "[deploy] Pulling latest code..."
git pull

echo "[deploy] Building API image..."
"${COMPOSE[@]}" build api

echo "[deploy] Running database migrations..."
"${COMPOSE[@]}" run --rm --no-deps api alembic upgrade head

echo "[deploy] Starting/restarting API (production overlay)..."
"${COMPOSE[@]}" up -d api

echo "[deploy] Waiting for container to report healthy in docker compose ps..."
for _ in {1..45}; do
  if "${COMPOSE[@]}" ps api | python3 -c 'import sys; s=sys.stdin.read().lower(); raise SystemExit(0 if "(healthy)" in s or " healthy" in s else 1)'; then
    break
  fi
  sleep 2
done

echo "[deploy] API status:"
"${COMPOSE[@]}" ps api

echo "[deploy] Verifying /health (may take a few seconds right after container start)..."
ok=0
for _ in {1..45}; do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" -ne 1 ]]; then
  echo "[deploy] ERROR: /health failed after waiting."
  "${COMPOSE[@]}" logs --tail 80 api || true
  exit 1
fi
echo "[deploy] Success."
exit 0

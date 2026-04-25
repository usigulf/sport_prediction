#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/deploy_api.sh
# Runs a safe API deploy on the droplet host:
# - pulls latest main
# - rebuilds + restarts API container
# - verifies container health and /health response

ROOT_DIR="${ROOT_DIR:-$HOME/sport_prediction}"
cd "$ROOT_DIR"

echo "[deploy] Pulling latest code..."
git pull

echo "[deploy] Rebuilding and restarting API..."
docker compose up -d --build api

echo "[deploy] Waiting for container to report healthy in docker compose ps..."
for _ in {1..45}; do
  if docker compose ps api | python3 -c 'import sys; s=sys.stdin.read().lower(); raise SystemExit(0 if "(healthy)" in s or " healthy" in s else 1)'; then
    break
  fi
  sleep 2
done

echo "[deploy] API status:"
docker compose ps api

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
  docker compose logs --tail 80 api || true
  exit 1
fi
echo "[deploy] Success."
exit 0

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

echo "[deploy] Waiting for container health..."
for _ in {1..30}; do
  if docker compose ps api | python3 -c 'import sys; s=sys.stdin.read().lower(); raise SystemExit(0 if "healthy" in s or "up" in s else 1)'; then
    break
  fi
  sleep 2
done

echo "[deploy] API status:"
docker compose ps api

echo "[deploy] Verifying /health..."
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null; then
    echo "[deploy] Success."
    exit 0
  fi
  sleep 2
done
echo "[deploy] ERROR: /health failed after waiting."
exit 1

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
for _ in {1..20}; do
  STATUS="$(docker compose ps --format json api | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0].get("Health",""))' 2>/dev/null || true)"
  if [[ "$STATUS" == "healthy" ]]; then
    break
  fi
  sleep 3
done

echo "[deploy] API status:"
docker compose ps api

echo "[deploy] Verifying /health..."
curl -fsS "http://127.0.0.1:8000/health" >/dev/null
echo "[deploy] Success."

#!/usr/bin/env bash
# Start staging API locally on http://127.0.0.1:8001 (no public DNS).
#
# Usage:
#   ./scripts/run_staging_local.sh
#
# Requires Docker. Creates .env.staging if missing (via setup_staging_env.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGING_PORT="${STAGING_PORT:-8001}"
COMPOSE=(docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml)

echo "[staging-local] Bootstrapping .env.staging..."
ROOT_DIR="$ROOT" "$ROOT/scripts/setup_staging_env.sh"

echo "[staging-local] Starting postgres + redis..."
docker compose -f docker-compose.yml up -d postgres redis

echo "[staging-local] Ensuring staging database..."
"$ROOT/scripts/ensure_staging_database.sh"

echo "[staging-local] Building api-staging..."
"${COMPOSE[@]}" build api-staging

echo "[staging-local] Running migrations..."
"${COMPOSE[@]}" run --rm --no-deps api-staging alembic upgrade head

echo "[staging-local] Starting api-staging..."
"${COMPOSE[@]}" up -d api-staging

echo "[staging-local] Waiting for /health..."
ok=0
for _ in {1..45}; do
  if curl -fsS "http://127.0.0.1:${STAGING_PORT}/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "$ok" -ne 1 ]]; then
  echo "[staging-local] ERROR: /health failed on port ${STAGING_PORT}" >&2
  "${COMPOSE[@]}" logs --tail 60 api-staging || true
  exit 1
fi

curl -fsS "http://127.0.0.1:${STAGING_PORT}/health" | python3 -m json.tool
echo "[staging-local] Ready — API http://127.0.0.1:${STAGING_PORT}  OpenAPI http://127.0.0.1:${STAGING_PORT}/docs"
echo "[staging-local] Public URL (after DNS): https://api-staging.octobetiq.com — see docs/STAGING_ENVIRONMENT.md"

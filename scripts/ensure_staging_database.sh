#!/usr/bin/env bash
# Create sportsprediction_staging database on the prod Postgres container (idempotent).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.yml)
PG_CONTAINER="${PG_CONTAINER:-sport-prediction-postgres}"
DB_NAME="${STAGING_DB_NAME:-sportsprediction_staging}"

if ! "${COMPOSE[@]}" ps postgres 2>/dev/null | grep -q "(healthy)"; then
  echo "[staging-db] starting postgres..."
  "${COMPOSE[@]}" up -d postgres
fi

exists="$("${COMPOSE[@]}" exec -T postgres psql -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null | tr -d '[:space:]' || true)"

if [[ "${exists}" == "1" ]]; then
  echo "[staging-db] ${DB_NAME} already exists"
else
  echo "[staging-db] creating ${DB_NAME}..."
  "${COMPOSE[@]}" exec -T postgres psql -U postgres -c "CREATE DATABASE ${DB_NAME};"
  echo "[staging-db] created ${DB_NAME}"
fi

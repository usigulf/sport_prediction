#!/usr/bin/env bash
# Generate or rotate REDIS_PASSWORD in project .env files and restart redis + api.
#
# Usage (on API host):
#   ./scripts/setup_redis_password.sh              # generate if missing
#   ./scripts/setup_redis_password.sh --rotate     # force new password
#
# REDIS_URL stays redis://redis:6379/0; the API passes REDIS_PASSWORD separately.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ROTATE=false
if [[ "${1:-}" == "--rotate" ]]; then
  ROTATE=true
fi

generate_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 24 | tr -d '\n'
  else
    python3 -c "import secrets; print(secrets.token_urlsafe(24))"
  fi
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  touch "$file"
  chmod 600 "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # Use awk to avoid sed special-char issues in passwords.
    awk -v k="$key" -v v="$value" '
      BEGIN { done = 0 }
      $0 ~ "^" k "=" { print k "=" v; done = 1; next }
      { print }
      END { if (!done) print k "=" v }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

read_env_var() {
  local file="$1"
  local key="$2"
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2- || return 1
}

PASSWORD=""
for file in "$ROOT/.env" "$ROOT/.env.production"; do
  if [[ "$ROTATE" == false ]]; then
    existing="$(read_env_var "$file" REDIS_PASSWORD || true)"
    if [[ -n "$existing" && ${#existing} -ge 16 ]]; then
      PASSWORD="$existing"
      break
    fi
  fi
done

if [[ -z "$PASSWORD" ]]; then
  PASSWORD="$(generate_password)"
  echo "Generated new REDIS_PASSWORD (${#PASSWORD} chars)."
else
  echo "Keeping existing REDIS_PASSWORD (${#PASSWORD} chars)."
fi

for file in "$ROOT/.env" "$ROOT/.env.production"; do
  upsert_env_var "$file" REDIS_PASSWORD "$PASSWORD"
  upsert_env_var "$file" REDIS_URL "redis://redis:6379/0"
  echo "Updated REDIS_PASSWORD and REDIS_URL in $(basename "$file")"
done

echo "Restarting redis and api..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d redis api

echo "Waiting for API health..."
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    echo "API healthy."
    break
  fi
  sleep 2
done

if curl -fsS "http://127.0.0.1:8000/ready" | grep -q '"status":"ready"'; then
  echo "Ready check passed (DB + Redis)."
else
  echo "WARNING: /ready did not report ready — check logs: docker compose logs api redis" >&2
  exit 1
fi

echo "Redis auth enabled. Unauthenticated redis-cli on 127.0.0.1:6379 will fail (expected)."

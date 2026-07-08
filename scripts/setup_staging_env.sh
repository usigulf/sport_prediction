#!/usr/bin/env bash
# Bootstrap secrets/backup_offsite.env-style file for staging (idempotent).
# Copies DB/redis passwords from .env.production when present; generates staging-only JWT/cron secrets.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TARGET="${ROOT_DIR}/.env.staging"
EXAMPLE="${ROOT_DIR}/.env.staging.example"

_read_var() {
  local key="$1" file="$2"
  [[ -f "${file}" ]] || return 0
  grep -E "^${key}=" "${file}" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' || true
}

if [[ -f "${TARGET}" ]]; then
  echo "[staging-env] ${TARGET} already exists"
  exit 0
fi

if [[ ! -f "${EXAMPLE}" ]]; then
  echo "error: missing ${EXAMPLE}" >&2
  exit 1
fi

cp "${EXAMPLE}" "${TARGET}"
chmod 600 "${TARGET}"

pg_pass="$(_read_var POSTGRES_PASSWORD "${ROOT_DIR}/.env.production")"
pg_pass="${pg_pass:-$(_read_var POSTGRES_PASSWORD "${ROOT_DIR}/.env")}"
redis_pass="$(_read_var REDIS_PASSWORD "${ROOT_DIR}/.env.production")"
redis_pass="${redis_pass:-$(_read_var REDIS_PASSWORD "${ROOT_DIR}/.env")}"

staging_jwt="$(openssl rand -base64 32 | tr -d '\n')"
staging_cron="$(openssl rand -hex 24)"

python3 - <<PY
from pathlib import Path
path = Path("${TARGET}")
text = path.read_text(encoding="utf-8")
replacements = {
    "JWT_SECRET=REPLACE_WITH_32_PLUS_CHAR_RANDOM_SECRET": f"JWT_SECRET=${staging_jwt}",
    "PUSH_CRON_SECRET=REPLACE_WITH_RANDOM_CRON_SECRET": f"PUSH_CRON_SECRET=${staging_cron}",
}
pg = """${pg_pass}"""
redis = """${redis_pass}"""
if pg:
    replacements["POSTGRES_PASSWORD=REPLACE_SAME_AS_PRODUCTION_POSTGRES_PASSWORD"] = f"POSTGRES_PASSWORD={pg}"
    replacements["DATABASE_URL=postgresql://postgres:REPLACE_SAME_AS_PRODUCTION_POSTGRES_PASSWORD@postgres:5432/sportsprediction_staging"] = (
        f"DATABASE_URL=postgresql://postgres:{pg}@postgres:5432/sportsprediction_staging"
    )
if redis:
    replacements["REDIS_PASSWORD=REPLACE_SAME_AS_PRODUCTION_REDIS_PASSWORD"] = f"REDIS_PASSWORD={redis}"
for old, new in replacements.items():
    text = text.replace(old, new)
path.write_text(text, encoding="utf-8")
PY

echo "[staging-env] wrote ${TARGET}"
echo "[staging-env] Set Stripe test keys in ${TARGET} before checkout tests."

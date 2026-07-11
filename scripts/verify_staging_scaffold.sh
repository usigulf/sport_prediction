#!/usr/bin/env bash
# Verify staging environment scaffold (W50 / I58). No DNS required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

for f in \
  docker-compose.staging.yml \
  .env.staging.example \
  docs/STAGING_ENVIRONMENT.md \
  scripts/setup_staging_env.sh \
  scripts/ensure_staging_database.sh \
  scripts/deploy_staging_api.sh \
  scripts/deploy_staging_public_url.sh \
  scripts/check_staging_health.sh \
  scripts/run_staging_local.sh \
  deploy/nginx-octobetiq-staging-api.conf.example
do
  [[ -f "$ROOT/$f" ]] || { echo "FAIL missing $f"; exit 1; }
done

python3 <<'PY'
from pathlib import Path
root = Path(".").resolve()
compose = (root / "docker-compose.staging.yml").read_text(encoding="utf-8")
for needle in ("api-staging", "sportsprediction_staging", "8001"):
    if needle not in compose:
        raise SystemExit(f"missing {needle} in docker-compose.staging.yml")
staging_doc = (root / "docs/STAGING_ENVIRONMENT.md").read_text(encoding="utf-8")
if "run_staging_local.sh" not in staging_doc:
    raise SystemExit("STAGING_ENVIRONMENT.md should document run_staging_local.sh")
print("OK  staging scaffold")
PY

echo "[staging-scaffold] Done."

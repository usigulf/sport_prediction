#!/usr/bin/env bash
# Verify external-ops runbooks and scaffolds exist (blocked audit items).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOCS=(
  docs/EXTERNAL_OPS_PLAYBOOK.md
  docs/HA_AND_SCALING.md
  docs/CDN_STATIC_ASSETS.md
  docs/GOOGLE_PLAY_LAUNCH.md
  docs/ASC_OPS_CHECKLIST.md
  docs/MANAGED_POSTGRES_MIGRATION.md
  docs/OFFSITE_BACKUP_RUNBOOK.md
  docs/STAGING_ENVIRONMENT.md
  docs/ANNUAL_IAP_SETUP.md
)

SCRIPTS=(
  scripts/print_asc_keywords.sh
  scripts/asc_privacy_review_reminder.sh
  scripts/migrate_to_managed_postgres.sh
  scripts/deploy_staging_public_url.sh
  scripts/setup_offsite_backup.sh
  scripts/deploy_api_blue_green.sh
)

for f in "${DOCS[@]}" "${SCRIPTS[@]}" deploy/nginx-static-cache-snippet.conf.example; do
  [[ -f "$ROOT/$f" ]] || { echo "FAIL missing $f"; exit 1; }
done

python3 <<'PY'
from pathlib import Path
kw = Path("mobile/app-store-metadata/keywords.txt").read_text(encoding="utf-8").strip()
if not kw.startswith("sports,"):
    raise SystemExit("keywords.txt must start with sports,")
if "ports," in kw.split(",")[0]:
    raise SystemExit("keywords.txt must not start with ports")
playbook = Path("docs/EXTERNAL_OPS_PLAYBOOK.md").read_text(encoding="utf-8")
for section in ("W3", "I50", "I51", "I56", "I57", "I85", "W36"):
    if section not in playbook:
        raise SystemExit(f"EXTERNAL_OPS_PLAYBOOK missing {section}")
print("OK  external ops readiness")
PY

echo "[external-ops] Done."

#!/usr/bin/env bash
# Verify security scaffold (external audit #17). Does not run pen-tests or live restores.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for f in \
  docs/SECURITY_THREAT_MODEL.md \
  docs/MOBILE_SECURITY_CHECKLIST.md \
  docs/RESTORE_DRILL.md \
  docs/DATABASE_BACKUP.md \
  docs/OFFSITE_BACKUP_RUNBOOK.md \
  scripts/pip_audit_backend.sh \
  scripts/bandit_backend.sh \
  scripts/restore_drill_staging.sh \
  scripts/verify_db_backup.sh \
  scripts/verify_offsite_backup_scaffold.sh \
  .github/dependabot.yml \
  mobile/src/utils/authStorage.ts \
  mobile/src/utils/authStorage.test.ts
do
  if [[ ! -f "$f" ]]; then
    echo "FAIL missing $f"
    exit 1
  fi
done

python3 <<'PY'
from pathlib import Path

needles = {
    "docs/SECURITY_THREAT_MODEL.md": (
        "not a penetration test",
        "STRIDE",
        "pip_audit",
        "npm audit",
    ),
    "docs/MOBILE_SECURITY_CHECKLIST.md": (
        "SecureStore",
        "usesCleartextTraffic",
        "allowBackup",
    ),
    "docs/RESTORE_DRILL.md": (
        "restore_drill_staging.sh",
        "DRY_RUN",
        "sportsprediction_staging",
    ),
    "docs/DATABASE_BACKUP.md": ("pg_restore",),
    "mobile/src/utils/authStorage.ts": ("expo-secure-store", "SecureStore"),
    ".github/workflows/ci.yml": ("pip-audit", "npm audit", "bandit"),
    "scripts/restore_drill_staging.sh": ("DRY_RUN", "sportsprediction_staging"),
}
for path, tids in needles.items():
    text = Path(path).read_text(encoding="utf-8")
    for tid in tids:
        if tid not in text:
            raise SystemExit(f"missing {tid!r} in {path}")
print("OK  security scaffold (threat model, mobile checklist, restore drill, scans)")
PY

echo "[security-verify] Done."

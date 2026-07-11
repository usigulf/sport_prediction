#!/usr/bin/env bash
# Verify offsite backup scripts and docs exist (W4 / I10). No credentials required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

for f in \
  scripts/run_pg_backup.sh \
  scripts/pg_backup_docker.sh \
  scripts/pg_backup_offsite_copy.sh \
  scripts/setup_offsite_backup.sh \
  scripts/setup_db_backup_cron.sh \
  scripts/verify_db_backup.sh \
  docs/DATABASE_BACKUP.md \
  docs/OFFSITE_BACKUP_RUNBOOK.md \
  docs/backup_offsite.env.example
do
  [[ -f "$ROOT/$f" ]] || { echo "FAIL missing $f"; exit 1; }
done

python3 <<'PY'
from pathlib import Path
root = Path("scripts").resolve().parent
setup = (root / "scripts/setup_offsite_backup.sh").read_text(encoding="utf-8")
for needle in ("--check", "test_spaces_write_permission", "OFFSITE_BACKUP_S3_URI"):
    if needle not in setup:
        raise SystemExit(f"missing {needle!r} in setup_offsite_backup.sh")
crontab = (root / "deploy/crontab.example").read_text(encoding="utf-8")
if "run_pg_backup.sh" not in crontab:
    raise SystemExit("crontab.example missing run_pg_backup.sh")
print("OK  offsite backup scaffold")
PY

echo "[offsite-scaffold] Done."

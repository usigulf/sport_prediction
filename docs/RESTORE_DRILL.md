# Restore drill (audit #17)

Timed backup → staging restore → health smoke. Prefer staging before any production restore.

## Goal

Prove a recent `pg_dump` can rebuild a usable API within an acceptable RTO (target: **&lt; 60 minutes** for invite-beta).

## Prerequisites

- Local or VPS Docker Compose with Postgres
- At least one dump under `/root/backups/` (VPS) or a path you pass as `DUMP=`
- Staging compose / DB name `sportsprediction_staging` (see `docs/STAGING_ENVIRONMENT.md`)

## Dry run (print only)

```bash
DRY_RUN=1 bash scripts/restore_drill_staging.sh
```

## Live staging drill

```bash
# Optional: create dump first
./scripts/run_pg_backup.sh

DUMP=/root/backups/sportsprediction-YYYYMMDD-HHMM.dump \
  bash scripts/restore_drill_staging.sh
```

The script:

1. Restores into **staging** DB (not production `sportsprediction` unless `ALLOW_PROD_RESTORE=1` — discouraged)
2. Brings up / targets staging API when configured
3. Curls `/health`
4. Prints elapsed minutes for the ops log

## Manual VPS production restore

Only during maintenance. Follow `docs/DATABASE_BACKUP.md` § Restore. Always rehearsal on staging first (`docs/OFFSITE_BACKUP_RUNBOOK.md` § Restore drill).

## Drill log template

| Field | Value |
|-------|-------|
| Date (UTC) | |
| Dump file | |
| Environment | staging / prod |
| Start → healthy (minutes) | |
| Operator | |
| Issues | |

## Verify scaffold

```bash
bash scripts/verify_security_scaffold.sh
```

## Related

- `docs/DATABASE_BACKUP.md`
- `docs/OFFSITE_BACKUP_RUNBOOK.md`
- `docs/SECURITY_THREAT_MODEL.md`

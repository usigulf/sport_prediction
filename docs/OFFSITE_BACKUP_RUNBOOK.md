# Offsite backup runbook (W4 / I10)

Local Postgres backups run daily via cron. **Offsite copy** requires one-time credentials (DigitalOcean Spaces or SCP). This runbook covers setup, verification, and ops without storing secrets in git.

## Quick status (VPS)

```bash
cd ~/sport_prediction
./scripts/setup_offsite_backup.sh --check
./scripts/verify_db_backup.sh
```

Scaffold verify (no credentials — CI/dev):

```bash
bash scripts/verify_offsite_backup_scaffold.sh
```

## One-time setup — DigitalOcean Spaces

1. DO Control Panel → **Spaces** → create bucket (e.g. `octobetiq-backups`, region `nyc3`)
2. **API → Spaces keys** → generate key with **read + write**
3. On the VPS:

```bash
cd ~/sport_prediction
INSTALL_AWSCLI=1 \
OFFSITE_BACKUP_S3_URI=s3://octobetiq-backups/db/ \
AWS_ACCESS_KEY_ID=YOUR_KEY \
AWS_SECRET_ACCESS_KEY=YOUR_SECRET \
AWS_DEFAULT_REGION=nyc3 \
AWS_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com \
./scripts/setup_offsite_backup.sh
```

`setup_offsite_backup.sh` writes `secrets/backup_offsite.env`, probes write permission, and copies the newest local dump.

4. Enable strict monitoring:

```bash
# In deploy/crontab.example — uncomment OFFSITE_REQUIRED=1 line
OFFSITE_REQUIRED=1 ./scripts/verify_db_backup.sh
```

## One-time setup — SCP fallback

```bash
OFFSITE_BACKUP_SCP_TARGET=backup@backup-host:/var/backups/octobetiq/ \
./scripts/setup_offsite_backup.sh
```

Ensure passwordless SSH from the VPS (`ssh -o BatchMode=yes backup@backup-host true`).

## Daily flow

| Time (UTC) | Script | Log |
|------------|--------|-----|
| 03:00 | `run_pg_backup.sh` | `/var/log/pg_backup.log` |
| 03:30 | `verify_db_backup.sh` | `/var/log/pg_backup_verify.log` |

Install cron: `./scripts/setup_db_backup_cron.sh`

## Restore drill (staging first)

1. `./scripts/run_staging_local.sh` — isolated DB on port 8001
2. Restore a dump into `sportsprediction_staging` (see `docs/DATABASE_BACKUP.md` § Restore)
3. Smoke test `/health` and a read-only API call

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Spaces/S3 write denied` | Regenerate DO key with write scope; bucket must exist |
| `no local dump` | Run `./scripts/run_pg_backup.sh`; check postgres container |
| `offsite marker stale` | Check `/var/log/pg_backup.log`; re-run `pg_backup_offsite_copy.sh` |
| Local-only acceptable temporarily | Omit `OFFSITE_REQUIRED=1` until Spaces keys are ready |

See also `docs/DATABASE_BACKUP.md`, `docs/backup_offsite.env.example`.

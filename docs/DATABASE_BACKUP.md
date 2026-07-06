# Database backup (Postgres / Docker)

Production uses **Docker Compose** with TimescaleDB (`sport-prediction-postgres`). Backups are `pg_dump` custom-format files on the VPS, with an optional offsite copy.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/pg_backup_docker.sh` | `pg_dump` inside container → `/root/backups/sportsprediction-YYYYMMDD-HHMM.dump` |
| `scripts/pg_backup_offsite_copy.sh` | Copy newest dump to SCP or S3 (optional) |
| `scripts/run_pg_backup.sh` | Runs local + offsite (cron entrypoint) |
| `scripts/setup_db_backup_cron.sh` | Install `0 3 * * *` cron idempotently |
| `scripts/setup_offsite_backup.sh` | Write `secrets/backup_offsite.env` + test offsite copy |
| `scripts/verify_db_backup.sh` | Alert if local/offsite backups are stale or missing |

## Install on VPS

```bash
cd ~/sport_prediction
chmod +x scripts/pg_backup_docker.sh scripts/pg_backup_offsite_copy.sh scripts/run_pg_backup.sh
./scripts/setup_db_backup_cron.sh
```

Verify:

```bash
./scripts/run_pg_backup.sh
ls -lh /root/backups/sportsprediction-*.dump | tail -3
tail -20 /var/log/pg_backup.log
```

## Cron

`deploy/crontab.example` includes:

```cron
0 3 * * * /root/sport_prediction/scripts/run_pg_backup.sh >>/var/log/pg_backup.log 2>&1
```

Retention: `RETENTION_DAYS=14` (default) prunes old local dumps.

## Offsite copy (recommended)

Copy `docs/backup_offsite.env.example` to `secrets/backup_offsite.env` (gitignored, mode 600) on the server.

**Option A — SCP to another host**

```bash
OFFSITE_BACKUP_SCP_TARGET=backup@backup.example.com:/var/backups/octobetiq/
```

Ensure SSH key auth from the VPS (`BatchMode=yes`).

**Option B — S3**

```bash
OFFSITE_BACKUP_S3_URI=s3://your-bucket/octobetiq/db/
```

Requires `aws` CLI configured on the VPS (IAM user or instance role).

If neither variable is set, offsite copy is skipped (local backup still runs).

### DigitalOcean Spaces (recommended for NYC droplets)

1. Create a Space in the same region as the droplet (e.g. `nyc3`).
2. Generate Spaces access keys in the DO control panel.
3. On the VPS:

```bash
cd ~/sport_prediction
INSTALL_AWSCLI=1 \
OFFSITE_BACKUP_S3_URI=s3://your-space-name/octobetiq/db/ \
AWS_ACCESS_KEY_ID=... \
AWS_SECRET_ACCESS_KEY=... \
AWS_DEFAULT_REGION=nyc3 \
AWS_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com \
./scripts/setup_offsite_backup.sh
```

4. Confirm: `./scripts/setup_offsite_backup.sh --check`

Successful offsite copies write `/var/log/pg_backup_offsite.last`.

## Monitoring

- Cron log: `/var/log/pg_backup.log`
- Offsite success marker: `/var/log/pg_backup_offsite.last`
- Daily verify (after backup): `30 3 * * * .../scripts/verify_db_backup.sh` (see `deploy/crontab.example`)
- Alert if no new dump in 36h: `./scripts/verify_db_backup.sh` (exit 1)
- Enforce offsite in prod: `OFFSITE_REQUIRED=1 ./scripts/verify_db_backup.sh`

## Restore (disaster recovery)

**On the VPS** (stops writes — schedule maintenance):

```bash
cd ~/sport_prediction
DUMP=/root/backups/sportsprediction-20260704-0300.dump   # pick file
docker compose stop api prediction-scheduler 2>/dev/null || true

# Drop and recreate DB (destructive)
docker compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS sportsprediction;"
docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE sportsprediction;"

docker cp "${DUMP}" sport-prediction-postgres:/tmp/restore.dump
docker compose exec -T postgres pg_restore -U postgres -d sportsprediction --no-owner --no-acl /tmp/restore.dump
docker compose exec -T postgres rm -f /tmp/restore.dump

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api
curl -fsS http://127.0.0.1:8000/health
```

Test restores on a **staging** clone before relying on this in production.

For migrating to a **managed Postgres** provider (RDS, DigitalOcean, Neon, etc.), see **`docs/MANAGED_POSTGRES_MIGRATION.md`** and `scripts/migrate_to_managed_postgres.sh`.

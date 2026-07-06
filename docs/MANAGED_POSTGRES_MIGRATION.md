# Managed Postgres migration plan (P5-003)

Move production from **self-hosted TimescaleDB in Docker** (`sport-prediction-postgres` on the VPS) to a **managed Postgres** service (DigitalOcean Managed Database, AWS RDS, Neon, Supabase, etc.).

This plan builds on **P0-010** (`scripts/pg_backup_docker.sh`, offsite copy, `docs/DATABASE_BACKUP.md`).

---

## When to migrate

| Signal | Self-hosted Docker | Managed Postgres |
|--------|-------------------|------------------|
| Ops time on DB patches / disk | Growing | Provider handles |
| Need point-in-time recovery (PITR) | Manual dumps only | Built-in on most tiers |
| Multi-AZ / failover | You build it | Provider feature |
| Connection scaling | `max_connections=150` on one container | Pooler + larger limits |
| Compliance / audit logs | DIY | Provider logs |

**Current stack is fine** for early production on a single VPS. Migrate when backup/restore drills feel risky, you need HA, or DB maintenance competes with product work.

---

## Target architecture

```
┌─────────────────┐     DATABASE_URL (TLS)      ┌──────────────────────┐
│  VPS (API only) │ ──────────────────────────► │ Managed Postgres     │
│  docker api     │     optional: PgBouncer       │ (DO / RDS / Neon…)   │
│  docker redis   │                               │ automated backups    │
└─────────────────┘                               └──────────────────────┘
```

- **API** continues on the VPS (`docker-compose.prod.yml`).
- **Postgres container** is stopped after cutover (or kept read-only briefly for rollback).
- **Redis** stays on VPS for now (separate scale item).
- **Alembic** remains source of truth for schema; managed DB must reach `alembic_version` = head before traffic.

---

## Provider checklist (any vendor)

Create the managed instance with:

| Setting | Recommendation |
|---------|----------------|
| Engine | PostgreSQL **15** (matches `timescale/timescaledb:latest-pg15`) |
| Database name | `sportsprediction` |
| User | Dedicated app user (not superuser) |
| SSL/TLS | **Required** (`sslmode=require` in URL) |
| Network | Private VPC peering **or** IP allowlist = VPS public IP only |
| Extensions | `uuid-ossp` if needed; Timescale optional (app does not require hypertables today) |
| Backups | Enable automated daily + PITR if available |

Connection URL format:

```text
postgresql://APP_USER:PASSWORD@db-host.example.com:25060/sportsprediction?sslmode=require
```

---

## Pre-migration (staging drill)

1. **Restore drill** — Follow `docs/DATABASE_BACKUP.md` on a **staging** clone. Time the restore.
2. **Fresh backup** — `./scripts/run_pg_backup.sh` immediately before migration window.
3. **Schema head** — On VPS: `docker compose exec api alembic current` → note revision (should match `head`).
4. **Maintenance window** — Stop writes: `docker compose stop prediction-scheduler` (and any cron hitting DB).
5. **Row-count baseline** — Script captures counts from local DB (see `migrate_to_managed_postgres.sh`).

---

## Migration procedure (production)

Automated helper: **`scripts/migrate_to_managed_postgres.sh`**

### 1. Export from Docker Postgres

```bash
cd ~/sport_prediction
export MANAGED_DATABASE_URL='postgresql://USER:PASS@managed-host:5432/sportsprediction?sslmode=require'
./scripts/migrate_to_managed_postgres.sh
```

The script:

1. Runs `pg_backup_docker.sh` (unless `SKIP_BACKUP=1`)
2. Restores the dump into `MANAGED_DATABASE_URL` (empty database on provider)
3. Verifies `alembic_version` and sample table counts
4. Runs `alembic upgrade head` against managed URL via API container
5. Prints cutover steps

**Dry run** (no restore):

```bash
DRY_RUN=1 ./scripts/migrate_to_managed_postgres.sh
```

### 2. Cut over API

Edit server `.env` / `.env.production`:

```bash
# Before (Docker network)
# DATABASE_URL=postgresql://postgres:PASSWORD@postgres:5432/sportsprediction

# After (managed — TLS required)
DATABASE_URL=postgresql://APP_USER:PASSWORD@managed-host:25060/sportsprediction?sslmode=require
```

Redeploy:

```bash
./scripts/deploy_api.sh
```

Verify:

```bash
curl -fsS https://api.octobetiq.com/ready
curl -fsS https://api.octobetiq.com/health
# Smoke: login, upcoming games, subscription webhook test mode
```

### 3. Decommission local Postgres (after soak)

After 24–72h stable:

```bash
docker compose stop postgres
# Optional: keep volume 7d for rollback
# docker volume rm sport_prediction_postgres_data  # destructive
```

Update backup strategy:

- **Disable** VPS `run_pg_backup.sh` cron for Docker postgres (or repoint to logical export from managed if provider allows `pg_dump` over VPN).
- **Enable** provider automated backups + offsite export per vendor docs.

---

## Rollback

If managed DB fails after cutover:

1. `DATABASE_URL` back to `@postgres:5432/sportsprediction`
2. `docker compose up -d postgres api`
3. `./scripts/deploy_api.sh`
4. Accept data loss for writes that happened only on managed during failed window **or** re-dump managed → local if managed is still readable.

Keep the pre-migration `.dump` until soak completes.

---

## Docker Compose notes

No compose change is **required** for cutover — only `DATABASE_URL` changes.

Optional future overlay `docker-compose.managed-db.yml`:

```yaml
services:
  postgres:
    profiles: ["local-db"]
  api:
    depends_on: []  # remove hard dependency when using external DB
```

Use profile `local-db` for dev laptops only.

---

## Security

- Never commit `MANAGED_DATABASE_URL` with real passwords.
- Use provider **private networking** when VPS and DB are same cloud/region.
- Rotate `APP_USER` password after migration.
- Confirm `INTERNAL_ALLOWED_CIDRS` and nginx rules unchanged.

---

## Verification checklist

- [ ] `alembic current` on managed = `head`
- [ ] `/ready` returns 200 (DB + Redis)
- [ ] User login + JWT refresh
- [ ] Upcoming games + predictions
- [ ] Stripe / RevenueCat webhook idempotency tables present
- [ ] Provider backup job enabled
- [ ] Old postgres cron disabled or repurposed

---

## Related files

| File | Purpose |
|------|---------|
| `scripts/migrate_to_managed_postgres.sh` | Dump → restore → verify → alembic |
| `scripts/pg_backup_docker.sh` | Pre-migration backup |
| `scripts/deploy_api.sh` | Post-cutover deploy + migrations |
| `docs/DATABASE_BACKUP.md` | Backup / restore baseline |
| `.env.production.example` | `DATABASE_URL` template |

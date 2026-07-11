# Staging environment (PH2-009)

Isolated **staging API** on the same VPS as production: separate database (`sportsprediction_staging`), Redis DB `1`, port **8001**, public URL **`https://api-staging.octobetiq.com`**.

Production postgres/redis containers are shared; only the API process and DB name are isolated.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup_staging_env.sh` | Create `.env.staging` with unique JWT/cron secrets |
| `scripts/ensure_staging_database.sh` | `CREATE DATABASE sportsprediction_staging` (idempotent) |
| `scripts/run_staging_local.sh` | **Local-only** — Docker staging on `127.0.0.1:8001` (no DNS) |
| `scripts/deploy_staging_api.sh` | Build, migrate, start `api-staging`, verify `/health` |
| `scripts/deploy_staging_public_url.sh` | DNS check, nginx, Certbot TLS, public `/health` verify |
| `scripts/check_staging_health.sh` | Uptime probe for staging URL |

Scaffold verify (no VPS/DNS): `bash scripts/verify_staging_scaffold.sh`

## Local development (no DNS)

```bash
./scripts/run_staging_local.sh
curl http://127.0.0.1:8001/health
open http://127.0.0.1:8001/docs
```

Uses the same `docker-compose.staging.yml` overlay as production VPS staging.

```bash
cd ~/sport_prediction
git pull

# 1. Env file (copies DB/redis passwords from .env.production)
./scripts/setup_staging_env.sh
# Edit .env.staging — add Stripe *test* keys if testing checkout

# 2. Deploy staging API
chmod +x scripts/deploy_staging_api.sh scripts/ensure_staging_database.sh scripts/setup_staging_env.sh
./scripts/deploy_staging_api.sh

# 3. DNS (Namecheap → Advanced DNS):
#    Type A | Host api-staging | Value <VPS_IP> | TTL Automatic

# 4. TLS + nginx (from laptop or VPS after DNS propagates)
./scripts/deploy_staging_public_url.sh

# 5. Verify public
./scripts/check_staging_health.sh
```

`/health` returns `"environment": "staging"`. OpenAPI docs are enabled at `/docs` on staging only.

## Mobile / EAS

Use the `staging` build profile in `mobile/eas.json`:

```bash
cd mobile
eas build --profile staging --platform ios
```

Set `EXPO_PUBLIC_API_URL=https://api-staging.octobetiq.com/api/v1` in that profile.

## Workflow

1. Merge to `main`
2. `./scripts/deploy_staging_api.sh` — smoke test migrations + API
3. `./scripts/deploy_api.sh` — production cutover after staging OK

## Safety rules

- Use **Stripe test mode** keys in `.env.staging` only
- Never point staging at production Stripe webhooks
- Staging uses separate JWT secrets (sessions do not cross environments)
- Run restore drills on staging before production DB changes (`docs/DATABASE_BACKUP.md`)

## Compose reference

```bash
docker compose --env-file .env.staging \
  -f docker-compose.yml -f docker-compose.staging.yml \
  ps api-staging
```

Local health (on VPS): `curl http://127.0.0.1:8001/health`

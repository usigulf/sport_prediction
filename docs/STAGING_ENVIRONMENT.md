# Staging environment (PH2-009)

Isolated **staging API** on the same VPS as production: separate database (`sportsprediction_staging`), Redis DB `1`, port **8001**, public URL **`https://api-staging.octobetiq.com`**.

Production postgres/redis containers are shared; only the API process and DB name are isolated.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup_staging_env.sh` | Create `.env.staging` with unique JWT/cron secrets |
| `scripts/ensure_staging_database.sh` | `CREATE DATABASE sportsprediction_staging` (idempotent) |
| `scripts/deploy_staging_api.sh` | Build, migrate, start `api-staging`, verify `/health` |
| `scripts/check_staging_health.sh` | Uptime probe for staging URL |

## First-time VPS setup

```bash
cd ~/sport_prediction
git pull

# 1. Env file (copies DB/redis passwords from .env.production)
./scripts/setup_staging_env.sh
# Edit .env.staging — add Stripe *test* keys if testing checkout

# 2. Deploy staging API
chmod +x scripts/deploy_staging_api.sh scripts/ensure_staging_database.sh scripts/setup_staging_env.sh
./scripts/deploy_staging_api.sh

# 3. DNS: api-staging.octobetiq.com → VPS IP

# 4. TLS + nginx
sudo certbot certonly --nginx -d api-staging.octobetiq.com
sudo cp deploy/nginx-octobetiq-staging-api.conf.example /etc/nginx/sites-available/octobetiq-staging-api
sudo ln -sf /etc/nginx/sites-available/octobetiq-staging-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. Verify public
curl -fsS https://api-staging.octobetiq.com/health
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

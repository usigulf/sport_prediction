# Production Readiness Checklist

Use this checklist before deploying the API and app to production.

---

## Backend API

### Required

- [ ] **JWT secret** – Set `JWT_SECRET` to a strong random value (min 32 characters). Do not use the default dev secret. If `ENVIRONMENT=production` and the secret is weak, startup logs a critical warning.
- [ ] **Environment** – Set `ENVIRONMENT=production`.
- [ ] **CORS** – Set `CORS_ORIGINS` to your actual app origins (comma-separated), e.g. `https://yourapp.com,https://www.yourapp.com`. Remove or avoid wildcards.
- [ ] **Database** – Use PostgreSQL in production. Set `DATABASE_URL`. Run migrations with `alembic upgrade head`; do not rely on `create_all` on startup.
- [ ] **HTTPS** – Run the API behind a reverse proxy (e.g. nginx, Caddy) that terminates TLS. Do not expose the app directly on the public internet without HTTPS.

### Recommended

- [ ] **API docs** – Disable Swagger/ReDoc in production: set `OPENAPI_DOCS_ENABLED=false` in `.env` to avoid exposing `/docs` and `/redoc`.
- [ ] **Redis** – Use Redis for rate limiting and cache in production. Set `REDIS_URL`. If Redis is down, the app falls back to in-memory (per-instance); for multi-instance deployments Redis is recommended.
- [ ] **Stripe** – For premium subscriptions set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PREMIUM`, and `STRIPE_WEBHOOK_SECRET`. Configure the webhook in Stripe to point to `https://your-api.com/api/v1/subscription/webhook` (event: `checkout.session.completed`).
- [ ] **Internal cron** – If using the internal push-triggers endpoint, set `PUSH_CRON_SECRET` and pass it in the `X-Cron-Secret` header.
- [ ] **Monitoring** – Set `SENTRY_DSN` for error tracking. Use `LOG_LEVEL=WARNING` or `ERROR` in production if you prefer less verbose logs.
- [ ] **Explanation model** – Optional: set `EXPLANATION_MODEL_DIR` to the path containing `simple_model.pkl` and `feature_columns.pkl` for real “Why this prediction?” factors.

### Security and errors

- Exception handlers are production-aware: when `ENVIRONMENT=production`, database and unhandled errors return generic messages to the client; full details are logged server-side only.
- Rate limiting: auth endpoints by IP; prediction endpoints by user or IP. Tune with `RATE_LIMIT_AUTH_PER_MINUTE` and `RATE_LIMIT_PREDICTIONS_PER_MINUTE` if needed.

---

## Mobile app

- [ ] **API URL** – Set `EXPO_PUBLIC_API_URL` to your production API base (e.g. `https://api.yourapp.com/api/v1`). In dev the app uses localhost or the value in `mobile/.env`.
- [ ] **Auth persistence** – The app stores tokens in AsyncStorage and restores session on launch; ensure `setAuthToken` is called when restoring from storage so WebSocket and API calls use the token.
- [ ] **Build** – Use a production build (e.g. EAS Build) and point the app at the production API. Do not ship dev-only API URLs in release builds.

---

## Optional / Later

- **Live pipeline** – Live predictions and WebSocket currently use pre-game data; for real in-play updates you need a live score feed and in-play model (see `docs/LIVE_AND_REALTIME_GUIDE.md`).
- **Migrations** – Use Alembic for all schema changes in production; avoid `create_all` in app startup.
- **Indexes** – Review DB indexes for your query patterns (games by league/date, predictions by game, user favorites/views). Add composite indexes if you add new filters.

---

## Quick production `.env` (backend)

```env
ENVIRONMENT=production
JWT_SECRET=your-very-long-random-secret-at-least-32-characters
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://your-redis:6379/0
OPENAPI_DOCS_ENABLED=false
# STRIPE_*, PUSH_CRON_SECRET, SENTRY_DSN, etc. as needed
```

After changing env, restart the API.

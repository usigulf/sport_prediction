# Sports Prediction API

## Run the backend

```bash
./run.sh
```

Uses a virtualenv in `.venv` and starts the API on all interfaces (`--host 0.0.0.0`) so the app on a phone can connect via your machine's LAN IP. Port 8000, or 8001 if 8000 is in use.

## Database

**Default: SQLite** – No install needed. The file `app.db` is created in the backend directory on first run. Use this for local development (e.g. on macOS 12 where Homebrew/PostgreSQL are unsupported).

**PostgreSQL (optional)** – For production or if you have Postgres installed:

1. Create the database: `createdb sportsprediction`
2. Set `DATABASE_URL=postgresql://user:pass@localhost:5432/sportsprediction` in `.env`
3. Run migrations: `alembic upgrade head`

## Optional: real ML explanations

To show the model’s real feature importance in “Why this prediction?” (instead of the stub), train the simple model and point the backend at it:

1. From repo root: `cd ml/training && python train_simple_model.py` (creates `models/simple_model.pkl` and `feature_columns.pkl`).
2. Set `EXPLANATION_MODEL_DIR` to the path to that `models` directory (e.g. absolute path to `.../sport_prediction/models`).
3. Restart the backend. The explanation endpoint will then return the model’s feature importance as top factors.

## Push notifications

The app registers Expo push tokens via `POST /user/push-token`. Tokens are stored in `user_push_tokens`.

**Push triggers** (game reminders and high-confidence picks):

- **Game starting in ~1 hour** — Notifies users who have either team in favorites; only for games with `scheduled_time` in the next 50–70 minutes; at most once per user per game.
- **High-confidence pick ready** — Notifies users who have either team in favorites when the game has a prediction with `confidence_level='high'` and the game is still upcoming; at most once per user per game.

**Run triggers:**

1. **Cron script** (recommended):  
   `*/15 * * * * cd /path/to/sport_prediction && PYTHONPATH=backend backend/.venv/bin/python scripts/send_push_reminders.py`

2. **Internal API** (e.g. for serverless cron):  
   Set `PUSH_CRON_SECRET` in `.env`, then:  
   `curl -X POST -H "X-Cron-Secret: <secret>" http://localhost:8000/internal/push-triggers/run`

Sent reminders are recorded in `push_reminder_sent` so each user gets at most one notification per game per type.

## Rate limiting

Auth (login, register, refresh) is limited per IP; prediction endpoints are limited per user (or per IP when unauthenticated). Defaults: 20 auth requests/minute, 120 prediction requests/minute. Uses Redis when available, otherwise in-memory. Override with `RATE_LIMIT_AUTH_PER_MINUTE` and `RATE_LIMIT_PREDICTIONS_PER_MINUTE`.

## Endpoints

- `GET /health` – health check
- `GET /ready` – readiness (DB required; Redis optional – set `REDIS_URL=` or `REDIS_URL=disabled` to skip)
- `GET /docs` – Swagger UI
- API v1 under `/api/v1` (auth, games, user, stats, etc.)

## Stripe (Premium subscription)

To enable Premium checkout with a 7-day trial:

1. Create a product and recurring price in [Stripe Dashboard](https://dashboard.stripe.com/products).
2. Set in `.env`: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PREMIUM` (e.g. `price_xxx`), and optionally `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`.
3. **Webhook**: In Stripe Dashboard → Developers → Webhooks, add endpoint `https://your-api.com/api/v1/subscription/webhook`, event `checkout.session.completed`. Set `STRIPE_WEBHOOK_SECRET` in `.env`.
4. Mobile Paywall "Start 7-day free trial" calls `POST /api/v1/subscription/create-checkout` (auth required) and opens the returned URL in the browser. After payment, the webhook sets `subscription_tier = "premium"` for the user.

Without Stripe keys, the create-checkout endpoint returns 503 and the app shows an error.

## Production

- **JWT**: Set `JWT_SECRET` to a strong secret (min 32 characters). If `ENVIRONMENT=production` and the secret is weak or default, startup logs a critical warning.
- **CORS**: Set `CORS_ORIGINS` to your app’s origins (comma-separated).
- **Redis**: Optional. Set `REDIS_URL=` or `REDIS_URL=disabled` to skip Redis for `/ready` and use in-memory rate limiting.

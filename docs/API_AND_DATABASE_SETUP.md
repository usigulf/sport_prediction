# API & Database Setup – What You Need to Set

Minimum and optional settings so the API and database work.

---

## 1. Minimum (API + DB work with defaults)

**You don’t have to set anything** for local development:

- **Database:** SQLite is the default. On first start the backend creates `backend/app.db` and all tables. No database server or env vars needed.
- **API:** Runs on port 8000 (or 8001 if 8000 is busy). Base URL: `http://localhost:8000`, API prefix: `/api/v1`.
- **Auth:** Built-in dev JWT secret is used (fine for dev only).
- **Redis:** Default config points to `redis://localhost:6379/0`. If Redis is not running, the app still runs: rate limiting and cache fall back to in-memory.

**To run:**

```bash
cd backend
./run.sh
# or: .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Check: `GET http://localhost:8000/health` → `{"status":"healthy",...}`.  
Readiness: `GET http://localhost:8000/ready` → if DB is OK you get `{"status":"ready"}` (Redis is optional; see below).

---

## 2. Where to set variables

- **Backend:** `backend/.env` (copy from `backend/.env.example`). The app loads it via `config.py` (pydantic-settings, `env_file = ".env"`). All keys are optional; defaults are in `backend/app/config.py`.
- **Root `.env`:** There is a root `.env.example`; the FastAPI app reads from `backend/.env`, so use **`backend/.env`** for the API and database.

---

## 3. Database

| Goal | What to set | Notes |
|------|-------------|--------|
| **Use default (SQLite)** | Nothing | Creates `backend/app.db` and tables on startup. |
| **Use PostgreSQL** | In `backend/.env`: `DATABASE_URL=postgresql://user:password@host:5432/dbname` | Create the DB first. Then run `alembic upgrade head` from `backend/`; do **not** rely on `create_all` for production. |
| **Pool size (Postgres only)** | `DATABASE_POOL_SIZE=20`, `DATABASE_MAX_OVERFLOW=10` | Optional; defaults are in config. |

---

## 4. Redis (optional)

| Goal | What to set | Notes |
|------|-------------|--------|
| **Use Redis** | No change (default `REDIS_URL=redis://localhost:6379/0`) | Start Redis locally. Used for rate limiting and cache. `/ready` will check Redis if URL is set. |
| **Disable Redis** | In `backend/.env`: `REDIS_URL=` or `REDIS_URL=disabled` | App runs without Redis: in-memory rate limiting, no cache. `/ready` skips Redis check. |

---

## 5. Auth (JWT)

| Goal | What to set | Notes |
|------|-------------|--------|
| **Local dev** | Nothing | Default dev secret is used. |
| **Production** | In `backend/.env`: `JWT_SECRET=<at-least-32-char-secret>`, `ENVIRONMENT=production` | If `ENVIRONMENT=production` and secret is weak or default, startup logs a **critical** warning. |

---

## 6. CORS (if the app runs on another origin)

If your web or mobile app is served from a different origin (e.g. `https://myapp.com`), add it:

- In `backend/.env`: `CORS_ORIGINS=https://myapp.com,https://www.myapp.com` (comma-separated).

Defaults already include common localhost ports (e.g. 3000, 8081, 19006, 19000).

---

## 7. Stripe (Premium subscriptions)

Without Stripe, the API and DB still work; only “Create checkout” for premium will return 503.

| Goal | What to set (in `backend/.env`) |
|------|----------------------------------|
| **Enable checkout** | `STRIPE_SECRET_KEY=sk_test_...` or `sk_live_...`, `STRIPE_PRICE_ID_PREMIUM=price_xxx` |
| **Webhook (set user to premium after payment)** | `STRIPE_WEBHOOK_SECRET=whsec_...`; in Stripe add endpoint `POST .../api/v1/subscription/webhook`, event `checkout.session.completed` |
| **Redirect URLs** | `STRIPE_SUCCESS_URL=...`, `STRIPE_CANCEL_URL=...` (optional; have defaults) |

---

## 8. Real game analysis (explanations)

| Goal | What to set | Notes |
|------|-------------|--------|
| **Stub explanation** | Nothing | “Why this prediction?” uses a generic stub. |
| **Real model factors** | In `backend/.env`: `EXPLANATION_MODEL_DIR=/absolute/path/to/models` | That directory must contain `simple_model.pkl` and `feature_columns.pkl` (e.g. from `ml/training/train_simple_model.py`). Restart backend. |

---

## 9. Mobile app (connect to your API)

So the app can reach your API and DB (via the API):

- In **`mobile/.env`** (create from `mobile/.env.example` if needed):
  - **Local emulator:**  
    `EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1` (iOS) or `http://10.0.2.2:8000/api/v1` (Android emulator).
  - **Physical device (same LAN):**  
    `EXPO_PUBLIC_API_URL=http://YOUR_MACHINE_IP:8000/api/v1` (e.g. `http://192.168.1.100:8000/api/v1`).

The backend must be run with `--host 0.0.0.0` so it accepts connections from the phone (e.g. via `./run.sh`).

---

## 10. Quick reference – minimal `.env` files

**Backend only (API + SQLite, no Redis, no Stripe):**

- Create `backend/.env` only if you need overrides. Empty or no file is fine; defaults work.

**Backend with PostgreSQL and no Redis:**

```env
# backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sportsprediction
REDIS_URL=disabled
```

**Production-style (strong JWT, CORS, optional Redis):**

```env
# backend/.env
ENVIRONMENT=production
JWT_SECRET=your-very-long-secret-at-least-32-characters
CORS_ORIGINS=https://yourapp.com
# REDIS_URL=disabled   # if you don't use Redis
```

**Mobile (device on LAN):**

```env
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

---

## Summary

- **API and database work** with no env vars: SQLite + default JWT + in-memory fallback when Redis is unavailable.
- **Set `backend/.env`** for PostgreSQL, Redis on/off, production JWT, CORS, Stripe, or explanation model.
- **Set `mobile/.env`** so the app points to your API URL (required for device/LAN).

# API & Database Review

**Scope:** Backend FastAPI app and SQLAlchemy models (Octobet).  
**Reviewed:** Router, auth, games, user, stats, feed, leaderboards, challenges, subscription, internal; DB models and config.

---

## 1. API Overview

### Base & global

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Liveness: `{ status, service }` |
| `/ready` | GET | No | Readiness: DB required; Redis optional (skipped if `REDIS_URL` empty/disabled) |
| `/ws/live/{game_id}` | WebSocket | Query `?token=<jwt>` | Live updates (stub, 30s interval). **Premium required.** |

### Auth (`/api/v1/auth`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/register` | POST | No (rate-limited by IP) | Body: `email`, `password`. Returns `UserResponse`. |
| `/login` | POST | No (rate-limited) | Form: `username` (email), `password`. Returns `access_token`, `refresh_token`. |
| `/refresh` | POST | No (rate-limited) | Body: `refresh_token`. Returns new `access_token`. |
| `/logout` | POST | Yes | Client-side invalidation; returns message. |

### Games (`/api/v1/games`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/leagues` | GET | No | Returns `{ "leagues": [ { "id", "label" }, ... ] }` (allowed league codes). |
| `/upcoming` | GET | Optional | Query: `league`, `leagues` (comma), `date`, `skip`, `limit`. Games + latest prediction (respects free daily limit). **Pagination:** `skip` ≥ 0, `limit` 1–100 (default 20). |
| `/{game_id}` | GET | Optional | Single game + prediction (tier + daily limit). |
| `/{game_id}/predictions` | GET | Yes | Latest prediction; records view (history); free daily limit. |
| `/{game_id}/explanation` | GET | Yes | Explainability (top factors, stub or ML). Records view. Rate-limited. |
| `/{game_id}/player-props` | GET | Yes | **Premium only.** Stub list of props. |
| `/{game_id}/live-predictions` | GET | Yes | **Premium only.** Stub (latest pre-game). |
| `/{game_id}/share` | POST | Optional | Returns `message` + `image_base64` (Pillow-generated share graphic). |

### User (`/api/v1/user`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/me` | GET | Yes | Current user (`UserResponse`). |
| `/favorites` | GET | Yes | `{ teams, leagues }` (teams expanded, leagues as id/name). |
| `/favorites/teams/{team_id}` | POST | Yes | Add team to favorites. |
| `/favorites/teams/{team_id}` | DELETE | Yes | Remove team. |
| `/favorites/leagues/{league_code}` | POST | Yes | Add league (code in allowlist). |
| `/favorites/leagues/{league_code}` | DELETE | Yes | Remove league. |
| `/prediction-history` | GET | Yes | Paginated views (game + prediction id, viewed_at). |
| `/push-token` | POST | Yes | Body: `{ "token": "ExponentPushToken[xxx]" }`. |
| `/push-token` | DELETE | Yes | Query `?token=...` to remove one; no query = remove all for user. |
| `/me` | DELETE | Yes | **Account deletion:** user + favorites, prediction views, push tokens, push_reminder_sent. |

### Stats (`/api/v1/stats`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/accuracy` | GET | No | Historical accuracy: predicted winner vs actual for finished games; overall + `by_league`. |

### Feed (`/api/v1/feed`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/top-picks` | GET | Optional | Query: `leagues` (comma), `limit`. Upcoming games with predictions, sorted by confidence then time; respects free daily limit. |

### Leaderboards (`/api/v1/leaderboards`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `` | GET | Optional | Query: `period` (weekly \| monthly \| all), `limit`. Ranking by accuracy of **viewed** predictions on finished games; email masked. |

### Challenges (`/api/v1/challenges`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `` | GET | Yes | List current user’s challenges; optional `status` filter. Auto-resolve when all games finished. |
| `/{challenge_id}` | GET | Yes | Single challenge (creator only). |
| `` | POST | Yes | Body: `{ "game_ids": ["uuid", ...] }` (1–10). Create challenge. |

### Subscription (`/api/v1/subscription`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/create-checkout` | POST | Yes | Stripe Checkout Session (7-day trial); returns `{ url }`. |
| `/webhook` | POST | No (Stripe signature) | `checkout.session.completed` → set user `subscription_tier` to premium. |

### Internal (`/api/v1/internal`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/push-triggers/run` | POST | Header `X-Cron-Secret` | Runs game-starting reminders + high-confidence picks; returns counts. |

---

## 2. Database Overview

### Engine & session

- **Engine:** From `config.database_url` (default `sqlite:///./app.db`). SQLite: `check_same_thread=False`; PostgreSQL: pool size / max overflow from config.
- **Session:** `SessionLocal` via `get_db()` dependency; yield and close in finally.
- **GUID:** Custom `TypeDecorator` storing UUID as 36-char string (SQLite/Postgres compatible).
- **Tables:** For SQLite, `init_sqlite_tables()` creates all tables on startup from `Base.metadata`; PostgreSQL should use Alembic.

### Tables and relationships

| Table | Purpose | Key columns / relations |
|-------|---------|--------------------------|
| **users** | Accounts | `id` (GUID), `email` (unique), `password_hash`, `subscription_tier`, `created_at`, `updated_at`. |
| **teams** | Teams (shared across games) | `id`, `name`, `league`, `abbreviation`, `logo_url`, `created_at`. |
| **games** | Matches | `id`, `league`, `home_team_id`, `away_team_id`, `scheduled_time`, `status`, `home_score`, `away_score`, `venue`, `created_at`. FK → teams. |
| **predictions** | Per-game predictions | `id`, `game_id`, `model_version`, `home_win_probability`, `away_win_probability`, `expected_home_score`, `expected_away_score`, `confidence_level`, `created_at`. Unique (`game_id`, `model_version`, `created_at`). |
| **user_favorites** | Watchlist (teams + leagues) | `id`, `user_id`, `entity_type` ('team' \| 'league'), `entity_id` (team UUID or league code), `created_at`. Unique (`user_id`, `entity_type`, `entity_id`). CASCADE on user delete. |
| **user_prediction_views** | Prediction history | `id`, `user_id`, `game_id`, `prediction_id`, `viewed_at`. CASCADE user/game; SET NULL prediction. |
| **user_push_tokens** | Expo (etc.) push tokens | `id`, `user_id`, `token`, `platform`, `created_at`. Unique (`user_id`, `token`). CASCADE on user delete. |
| **push_reminder_sent** | Idempotency for push | `id`, `user_id`, `game_id`, `reminder_type`, `sent_at`. Unique (`user_id`, `game_id`, `reminder_type`). |
| **challenges** | User challenges | `id`, `creator_id`, `game_ids` (JSON array string), `status` (active \| completed), `correct_count`, `total_count`, `created_at`, `completed_at`. CASCADE on user delete. |

No separate `player` or `player_props` table; player props are stub-only in the API.

---

## 3. Strengths

- **API surface:** Covers auth (register, login, refresh, logout), games (`/leagues`, upcoming, by id, league/leagues/date), predictions (with daily limit and tier checks), explanations (stub + optional ML), favorites (teams and leagues), prediction history, push tokens, account deletion, stats/accuracy, feed/top-picks, leaderboards, challenges, Stripe checkout/webhook, internal push triggers, and WebSocket live (premium).
- **Conventions:** List endpoints use `PaginationParams`: `skip` ≥ 0, `limit` 1–100 (default 20). Game `scheduled_time` is returned as ISO 8601 (with `Z` for naive datetimes).
- **Auth & security:** JWT access + refresh; OAuth2PasswordBearer; optional auth for public endpoints; rate limiting (auth by IP, predictions by user or IP); CORS from config; production warning if `JWT_SECRET` is weak.
- **Database:** GUID type portable across SQLite/Postgres; FKs and unique constraints; CASCADE/SET NULL where appropriate; no N+1 on main paths (e.g. games with joinedload home_team, away_team).
- **Tier enforcement:** Free daily limit (e.g. 10) via cache key `daily_predictions:{user_id}:{date}`; premium required for player-props, live-predictions, WebSocket; explanation and prediction endpoints check limit/tier.
- **Readiness:** `/ready` requires DB; Redis optional (skipped if URL empty/disabled).
- **Stripe:** Checkout with trial; webhook updates `subscription_tier`; config-driven (secret, price id, webhook secret, success/cancel URLs).
- **Compliance:** Account deletion wipes user and related data (favorites, views, push tokens, reminders).

---

## 4. Gaps & Recommendations

### API

- **Games list and timezone:** `upcoming` uses `datetime.now()` (server time). **Done:** `scheduled_time` is returned as ISO 8601 (with `Z` for naive) in games, feed/top-picks, and prediction-history.
- **Pagination:** **Done:** `PaginationParams` enforces `skip` ≥ 0, `limit` 1–100 (default 20). Total is returned for upcoming and prediction-history.
- **Player props:** Endpoint exists (premium) but returns stub data only; no DB model. For real props, add a `player_props` (or similar) table and/or wire to ML.
- **Live pipeline:** `live-predictions` and WebSocket are stubs (latest pre-game). Replace with real in-play pipeline when available.
- **Errors:** 400/401/403/404/429/503 used appropriately; ensure 500 are logged and not over-detailed in response (exception handler already in place).

### Database

- **Migrations:** SQLite uses `create_all`; for production Postgres, use Alembic and avoid `create_all` in app startup.
- **Indexes:** `league`, `scheduled_time`, `status` on games; `game_id`, `created_at` on predictions; `user_id` on favorites/views/push_tokens/challenges. Good for current queries; add indexes if you add new filters (e.g. composite).
- **Prediction uniqueness:** Unique on (`game_id`, `model_version`, `created_at`) allows multiple predictions per game (e.g. per run). If you want “single latest per game” only, consider a view or application logic (current “latest” is by `order_by(created_at).first()`).
- **Challenge `game_ids`:** Stored as JSON string; no FK to games. Orphaned UUIDs (deleted games) could leave challenges with invalid refs; resolve logic already skips missing games. Optional: validate game_ids exist and are scheduled when creating challenge.

### Config & ops

- **JWT secret:** Default is a long dev string; production must set strong `JWT_SECRET` (env). Startup already warns in production.
- **Redis:** Used for rate limiting and cache (e.g. prediction cache, daily limit). If Redis is down, rate_limit_service and CacheService should fall back (in-memory or no-op) so app still runs; confirm behavior.
- **Stripe:** Optional; if not set, checkout returns 503. Webhook secret must be set for webhook to run.

---

## 5. Quick reference

- **Prefix:** All v1 API under `/api/v1` (from `settings.api_v1_prefix`).
- **Auth header:** `Authorization: Bearer <access_token>`.
- **Optional auth:** Used for `/games/upcoming`, `/games/{id}`, `/feed/top-picks`, `/stats/accuracy`, `/leaderboards`; when token is valid, response can include user-specific data (e.g. predictions when under limit).
- **Rate limits:** Auth (register, login, refresh): 20/min by IP. Predictions (explanation, predictions, player-props, live): 120/min by user or IP.
- **DB init:** SQLite tables created in `main.py` startup via `init_sqlite_tables()`; imports all model modules so `Base.metadata` has every table.

This review aligns with the current `backend/app` layout and behavior; use it as a baseline for onboarding and for planning migrations or new endpoints.

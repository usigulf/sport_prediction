# Octobet: What’s Working vs What’s Not

**Purpose:** Align the live codebase with ARCHITECTURE_DESIGN.md and ARCHITECTURE.md.  
**Scope:** Backend (FastAPI), mobile (Expo/React Native), DB/seed, and design docs.

---

## 1. Working End-to-End

### Backend (FastAPI)

| Area | Status | Notes |
|------|--------|--------|
| **Auth** | ✅ | Register, login, logout, refresh token; JWT + bcrypt; 401 → refresh then retry. |
| **Games** | ✅ | `GET /games/upcoming` with `league`, `leagues` (comma-separated), `date`, pagination; `GET /games/{id}`; multi-league filter. |
| **Predictions** | ✅ | Latest prediction per game; included in game payload when user has access; daily limit for free tier. |
| **Explanations** | ✅ | `GET /games/{id}/explanation` — real feature importance when `EXPLANATION_MODEL_DIR` set, else stub. |
| **Player props** | ✅ | `GET /games/{id}/player-props` — stub; premium-only (403 for free). |
| **Live predictions** | ✅ | `GET /games/{id}/live-predictions` (stub: latest pre-game); WebSocket `WS /ws/live/{game_id}` (30s updates). |
| **User** | ✅ | `GET /user/me`, favorites (teams + leagues), prediction history, push token, **DELETE /user/me** (account deletion). |
| **Stats** | ✅ | `GET /stats/accuracy` — prediction-vs-outcome for finished games; total, correct, accuracy_pct, by_league. Backend supports both `status == "finished"` and `"final"` so it works with current seed data. |
| **Health / readiness** | ✅ | `GET /health`, `GET /ready` (DB + Redis). |
| **CORS, rate limiting** | ✅ | CORS for dev/prod; rate limits on auth and prediction endpoints; Redis or in-memory fallback. |
| **Internal** | ✅ | `POST /internal/push-triggers/run` (cron) for game reminders and high-confidence picks. |
| **Feed** | ✅ | `GET /feed/top-picks` — today’s games with predictions, ordered by confidence; optional `leagues`, `limit`. |
| **Leaderboards** | ✅ | `GET /leaderboards` — users ranked by accuracy of viewed picks; `period` = weekly \| monthly \| all. |
| **Challenges** | ✅ | `GET/POST /challenges`, create (game_ids), list (by user), resolve when games finish; mobile CreateChallengeScreen + ChallengesScreen. |
| **Share** | ✅ | `POST /games/{game_id}/share` — returns `message` + `image_base64` (Pillow PNG); mobile shares image via expo-sharing. |
| **Subscription** | ✅ | `POST /subscription/create-checkout` (Stripe, 7-day trial), webhook sets `subscription_tier`; Paywall opens Checkout when Stripe configured. |

### Mobile (Expo / React Native)

| Area | Status | Notes |
|------|--------|--------|
| **Navigation** | ✅ | Unauthenticated: Landing → Login / Register. Authenticated: MainTabs (Home, **Trending**, Games, Favorites, Profile) + stack (GameDetail, Paywall, Accuracy, Leaderboards, Challenges, CreateChallenge, **My Picks**, Settings, Help, Privacy, Terms). |
| **Trending tab** | ✅ | Renamed from Live Hub; today’s best picks from `GET /feed/top-picks`; “Starts in X” badge; tap → GameDetail. |
| **Games (BetQL-style)** | ✅ | Sport pills (All, My leagues, NFL, NBA, … Soccer) + sub-tabs: **Model Picks** (upcoming with predictions), **Trending Picks** (top-picks for league), **Player Props** (placeholder → Game Detail). Request cancel on league change; AbortError not logged. |
| **Leaderboards** | ✅ | Screen from Profile; weekly/monthly/all; calls `GET /leaderboards`; highlights current user. |
| **Challenges** | ✅ | Profile → Challenges: list, create (pick up to 10 games), result X/Y correct when resolved. CreateChallengeScreen for game selection. |
| **My Picks** | ✅ | Profile → My Picks (prediction history); picks you’ve viewed. |
| **Share pick** | ✅ | “Share this pick” uses backend PNG (image_base64) with expo-sharing; fallback to message-only. |
| **Game detail** | ✅ | Prediction card with **pick strength (1–5 stars)**, “Why this prediction?” button + full analysis, Share this pick, player props (premium or CTA), live WebSocket (premium). Prediction section always shown (loading / card / no prediction). |
| **Profile** | ✅ | Tier badge, Subscription, **My Picks**, Accuracy, Leaderboard, Challenges, Settings, Help, Privacy, Terms, Delete account, Logout. |
| **Auth** | ✅ | Login, Register; token in memory + AsyncStorage; backend health check on login; refresh on 401. |
| **Theme** | ✅ | Dark theme (#0A1428, #00FF9F, #FF3366); theme constants; applied to Home, Games, GameCard, PredictionCard, Login, Favorites, Profile, navigator. |
| **API client** | ✅ | Base URL (incl. 8000/8001 fallback), auth header, refresh on 401, timeout; `getUpcomingGames(leagues)`, favorites, deleteAccount, etc. |
| **Offline / cache** | ✅ | Games list cached to AsyncStorage; “Updated at …” / “Offline – showing cached data …”. |
| **Push** | ✅ | Expo push token registration; Settings toggle; backend stores token and send pipeline (e.g. `send_push_reminders.py`). |
| **Paywall** | ✅ | Free / Premium (Stripe Checkout + 7-day trial when configured) / Pro (“Coming soon”). Refetch tier on focus. |
| **Accuracy** | ✅ | Calls `GET /stats/accuracy`; overall and per-league breakdown. |

### Data & config

| Area | Status | Notes |
|------|--------|--------|
| **Seed data** | ✅ | Teams/games/predictions for NFL, NBA, MLB, NHL, Premier League, Champions League, Boxing, Tennis, Golf, MMA; game status `scheduled` / `finished`. |
| **Leagues** | ✅ | `SPORT_OPTIONS` and `AVAILABLE_LEAGUES` in mobile match backend `ALLOWED_LEAGUE_CODES`. |
| **Database** | ✅ | SQLite default; migrations/tables via `init_sqlite_tables`; PostgreSQL via `DATABASE_URL`. |

---

## 2. Partially Working / Stubs

| Item | Status | Notes |
|------|--------|--------|
| **Player props** | Stub | Backend returns stub data; premium gating works. Real props need ML/ingestion. |
| **Live predictions** | Stub | REST and WebSocket return/send latest pre-game prediction; no real in-play pipeline. |
| **Explanations** | Optional | Real SHAP/feature importance when `EXPLANATION_MODEL_DIR` is set; otherwise stub. |
| **Paywall / subscription** | ✅ | Stripe create-checkout + webhook; Paywall “Start 7-day free trial” opens Checkout. Set Stripe env vars to enable. |

---

## 3. Not Implemented (vs ARCHITECTURE_DESIGN / ARCHITECTURE)

These are in the design docs but **not** in the current app or API.

### Backend

| Missing | Doc reference | Notes |
|---------|----------------|--------|
| **GET /user/for-you** | ARCHITECTURE_DESIGN §4.3 | Home “Best Picks for You” uses top-picks + favorite leagues; no dedicated for-you endpoint. |
| **GET /community/tips** | ARCHITECTURE_DESIGN §4.3 | User-generated tips (verified). |
| **Sport query param** | Design | Some endpoints have `league`/`leagues`; design also mentions `sport` where useful. |
| **Challenges (full)** | — | ✅ Implemented: create (game_ids), list, resolve (X/Y correct). |

### Mobile

| Missing | Doc reference | Notes |
|---------|----------------|--------|
| **For You feed** | — | ✅ “Best Picks for You” on Home (top-picks by favorite leagues when logged in). |
| **Onboarding wizard** | ARCHITECTURE_DESIGN §2.1.5 | Multi-select sports/teams + persona quiz (Casual / Fantasy / Analytics). |
| **Daily digest push** | ARCHITECTURE_DESIGN §2.1.5 | “Your Teams + High-Confidence Cross-Sport Picks”. |
| **Pro plan (Stripe)** | ARCHITECTURE_DESIGN §7.1 | Premium has Stripe + trial; Pro still “Coming soon”. |
| **Live Hub momentum graphs** | ARCHITECTURE_DESIGN §5.3 | Tab shows today’s picks; in-game momentum charts not yet. |

### ML / data pipeline

| Missing | Doc reference | Notes |
|---------|----------------|--------|
| **Per-sport models** | ARCHITECTURE_DESIGN §3.3.5, ARCHITECTURE §3 | Per-sport (and per-league) model specialization and tuning. |
| **Sport-specific drift** | ARCHITECTURE_DESIGN §3.5.1, ARCHITECTURE §3.5 | Drift detection and retraining triggers per sport. |
| **Esports / UFC data** | ARCHITECTURE_DESIGN §3.1.1, ARCHITECTURE §3.1 | Esports (e.g. LoL, CS2) and UFC/MMA feeds and models. |
| **Real-time live pipeline** | Both docs | Live in-play model and pipeline (currently stubbed). |

---

## 4. Bugs / Inconsistencies (Resolved or Not Applicable)

| Issue | Status |
|-------|--------|
| **Stats accuracy showed 0%** | Backend already supports both `Game.status in ("finished", "final")`; works with seed data. |
| **Login sent user back to Landing** | Resolved: removed `navigation.replace('MainTabs')` from LoginScreen; auth state change alone switches to the authenticated stack. |

---

## 5. Summary Table

| Category | Working | Partial / Stub | Not implemented |
|----------|---------|-----------------|------------------|
| **Backend API** | Auth, games, predictions, explanations, user, stats, feed, leaderboards, share (image), subscription (Stripe), health, internal, WebSocket | Player props, live predictions, explanations (optional), challenges | for-you, community/tips, challenges (full) |
| **Mobile screens** | Landing, Home, Live Hub, Games, Game Detail, Favorites, Profile, Login, Register, Paywall (Stripe), Accuracy, Leaderboards, Challenges (stub), Settings, Help, Privacy, Terms, Share (image) | Challenges (empty) | For You feed, Onboarding wizard, momentum graphs |
| **Product features** | Multi-sport filters, favorites, dark theme, account deletion, push, feed, leaderboards, share (image), Stripe trial/payment | Challenges stub | Full challenges, For You, onboarding |
| **Data / ML** | Seed for 10 leagues, game statuses | — | Per-sport models, drift, esports/UFC, real live pipeline |

---

## 6. Suggested Next Steps (priority)

1. **Keep core stable** — Auth, games, predictions, favorites, and theme are in good shape; avoid breaking changes there.
2. **Backend: feed and leaderboards** — ✅ **Done.** `GET /feed/top-picks`, `GET /leaderboards` (weekly/monthly/all).
3. **Mobile: Live Hub tab** — ✅ **Done.** Tab shows today’s top picks; navigator + LiveHubScreen.
4. **Subscription** — Integrate Stripe (or other) for Premium and 7-day trial when ready; backend already has `subscription_tier`.
5. **Gamification** — ✅ **Done (v1).** Leaderboards UI + API; Challenges stub (GET/POST); Share pick (message only, “Share this pick” on GameDetail).

Use this document to track what’s working, what’s stubbed, and what’s still to build relative to the architecture docs.

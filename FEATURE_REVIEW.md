# Octobet: Feature Review — What Works, What You Do, What to Add/Remove

**Purpose:** One place to see what’s working, what you need to configure or do, and what to add or remove.

---

## 1. What works (no extra setup)

These work as soon as backend and mobile are running with a seeded DB.

| Feature | Where | Notes |
|--------|--------|--------|
| **Landing** | Mobile | Hero, CTAs, “Get Free Daily Picks” → Register, “Log in” → Login. |
| **Register / Login / Logout** | Mobile + Backend | JWT + refresh; token in memory + AsyncStorage; logout switches to unauthenticated stack. |
| **Delete account** | Profile → Delete account | Calls `DELETE /user/me`; clears session. |
| **Home** | Main tab | Sport pills, **Best Picks for You** (top-picks by favorites), Live Now, Featured Game, games by league; dark theme; pull-to-refresh; cache. |
| **Trending** | Main tab | Renamed from Live Hub; today’s best picks from `GET /feed/top-picks`; “Starts in X” badge; tap → GameDetail. |
| **Games** | Main tab | **BetQL-style:** Sport pills (All, My leagues, NFL, NBA, … Soccer) + **Model Picks | Trending Picks | Player Props** sub-tabs. Model = upcoming games; Trending = top-picks for selected league; Props = CTA to Game Detail. |
| **Favorites** | Main tab | Favorite teams + leagues; add/remove leagues; upcoming for favorite leagues. |
| **Game detail** | Tap any game | Prediction card with **pick strength (1–5 stars)**, “Why this prediction?” button for full analysis, Share this pick (image or text), player props (premium or CTA), live WebSocket (premium, JWT required). |
| **Share pick** | Game detail → “Share this pick” | Backend generates PNG (Pillow); mobile shares image via expo-sharing or falls back to text. |
| **Feed / top picks** | Backend `GET /feed/top-picks` | Today’s games with predictions, ordered by confidence. |
| **Leaderboards** | Profile → Leaderboard | Weekly/monthly/all; `GET /leaderboards`; highlights “You”. |
| **Challenges** | Profile → Challenges | Screen shows “Coming soon”; API returns empty list. |
| **Accuracy** | Profile → Model accuracy | `GET /stats/accuracy`; overall + by league; dark theme. |
| **Prediction history** | Profile → Prediction History | List of viewed predictions. |
| **Settings** | Profile → Settings | Push toggle, etc. |
| **Help / Privacy / Terms** | Profile | Static screens. |
| **Paywall** | Profile → Subscription | Shows Free / Premium / Pro; “Start 7-day free trial” opens Stripe Checkout **if Stripe is configured** (see below). |
| **Auth APIs** | Backend | Register, login, refresh, logout. |
| **Games APIs** | Backend | Upcoming, by id, league/leagues, date. |
| **Predictions** | Backend | Latest per game; daily limit for free; included in game when allowed. |
| **Explanations** | Backend | Real when `EXPLANATION_MODEL_DIR` set, else stub. |
| **User / favorites** | Backend | me, favorites (teams/leagues), prediction-history, push-token, delete account. |
| **Stats** | Backend | `GET /stats/accuracy` (finished games). |
| **Health / ready** | Backend | `GET /health`; `GET /ready` (DB required; Redis optional if `REDIS_URL` empty/disabled). |
| **Internal cron** | Backend | `POST /internal/push-triggers/run` for push reminders. |
| **Theme** | Mobile | Dark theme (Accuracy, GameDetail, Profile, etc.); error banners + retry on Profile/Paywall. **BetQL alignment:** Pick strength stars, Best Picks, Model/Trending/Props tabs; see `docs/BETQL_ARCHITECTURE_OCTOBET.md`. |

---

## 2. What you need to do (setup / config)

| Task | What to do |
|------|------------|
| **Run backend** | `cd backend && ./run.sh` (or `make` per README). Uses port 8000, or 8001 if 8000 in use. |
| **Run mobile** | Node **20+** required. `cd mobile && npm start`. See `mobile/NODE_VERSION.md` if you see `toReversed is not a function`. |
| **Seed database** | So login works: `make seed` or `cd backend && ./seed.sh`. Use test users (see `DEV_CREDENTIALS.md`), e.g. `test@example.com` / `testpass123`. |
| **API URL (device)** | If backend is on another port or machine: set `EXPO_PUBLIC_API_URL=http://YOUR_IP:PORT/api/v1` in `mobile/.env`. |
| **Stripe (real payments)** | 1) Create product + price in Stripe Dashboard. 2) In `backend/.env`: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PREMIUM`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`. 3) Webhook URL in Stripe: `https://your-api.com/api/v1/subscription/webhook`, event `checkout.session.completed`. Without these, “Start 7-day free trial” returns 503 and app shows error. |
| **Production** | Set `JWT_SECRET` (strong, min 32 chars), `ENVIRONMENT=production`, `CORS_ORIGINS`. Optional: `REDIS_URL=` or `disabled` to skip Redis for `/ready`. See `backend/.env.example` and `backend/README.md`. |
| **Share image** | Backend needs Pillow: `pip install Pillow` (in backend venv). If Pillow missing, share still works with text only. |
| **Push (full)** | Expo Go has limits; use a development build for full push. Cron or scheduler must call push-triggers (see backend README). |

---

## 3. What to add (from design or roadmap)

Not built yet; add when you want the capability.

| Feature | Priority | Notes |
|---------|----------|--------|
| **Challenges (full)** | — | ✅ Done: create/list/resolve; CreateChallengeScreen + ChallengesScreen. |
| **WebSocket auth** | — | ✅ Done: JWT in query + premium tier required for `/ws/live/{game_id}`. |
| **For You feed** | — | ✅ Done: “Best Picks for You” on Home (top-picks by favorite leagues). |
| **Onboarding** | Medium | First-run: choose sports/teams or short persona quiz. |
| **Daily digest push** | Low | “Your teams + high-confidence picks” push. |
| **Live Hub momentum** | Low | In-game momentum charts on Live Hub. |
| **Pro plan (Stripe)** | Low | Second price ID + “Subscribe” for Pro; currently “Coming soon”. |
| **Community tips** | Low | `GET /community/tips` (user-generated, verified). |
| **Real live pipeline** | Later | Replace live-prediction/WebSocket stubs with real in-play model + ingestion. |
| **Per-sport models / drift** | Later | Per ARCHITECTURE_DESIGN when you have multiple models. |
| **Esports / UFC** | Later | Data + models for those sports. |

---

## 4. What to remove (optional cleanup)

Nothing is required to remove. Optional:

| Item | Why consider |
|------|----------------|
| **Duplicate/legacy docs** | You have `ARCHITECTURE.md`, `ARCHITECTURE_DESIGN.md`, `PredictIQ_ARCHITECTURE.md`, etc. Keep one source of truth for “current product”; archive or trim the rest to avoid confusion. |
| **“Coming soon” on Pro** | Either add Stripe for Pro or change copy to “Contact us” so it’s clear it’s not yet purchasable. |
| **Challenges screen** | — | Implemented; create + list + results. |

---

## 5. Stubs / partial (work but limited)

| Feature | Status | What’s missing |
|---------|--------|----------------|
| **Player props** | Stub | Backend returns stub data; premium gating works. Real props need ML/ingestion. |
| **Live predictions** | Stub | REST + WebSocket use latest pre-game prediction; no in-play model. |
| **Explanations** | Optional | Real SHAP when `EXPLANATION_MODEL_DIR` set; else stub. |
| **Challenges API** | ✅ | Create, list, get, resolve (X/Y correct when all games finished). |

---

## 6. Quick checklist

- [ ] Backend running (`./run.sh`), DB seeded, can log in with test user.
- [ ] Mobile running (Node 20+), can open app and hit API (localhost or `EXPO_PUBLIC_API_URL`).
- [ ] (Optional) Stripe keys in `backend/.env` so Paywall “Start 7-day free trial” works.
- [ ] (Optional) Webhook configured in Stripe so tier becomes premium after payment.
- [ ] (Production) Strong `JWT_SECRET`, `CORS_ORIGINS`, optional Redis.

Use this doc to see at a glance what works, what you need to do, and what to add or remove.

# Incomplete features — work one at a time

Work in this order. **Do not start the next item until you’ve completed the “Your actions” for the current one** and replied **“done with #N”** (or what you finished / what’s blocked).

| # | Feature | Code status | Who finishes it |
|---|---------|-------------|-----------------|
| **1** | [Production billing](#1-production-billing) | ✅ You confirmed done | — |
| **2** | [AdMob production](#2-admob-production) | ✅ You confirmed done | — |
| **3** | [Push notifications](#3-push-notifications) | ✅ You confirmed done | — |
| **4** | [For You feed](#4-for-you-feed) | ✅ Shipped | — |
| **5** | [Player props](#5-player-props) | ✅ Shipped | — |
| **6** | [NFL/NBA real ML](#6-nflnba-real-ml) | ✅ Shipped | — |
| **7** | [Post-register auto login](#7-post-register-auto-login) | ✅ You confirmed done (build 23) | — |
| **8** | [Landing fallback picks](#8-landing-fallback-picks) | ✅ You confirmed done (build 23) | — |
| **9** | [Live in-play ML](#9-live-in-play-ml) | Pre-game poll only | **Us** (large; defer) |

Already shipped in repo (no longer on this list): guest Privacy/Terms, challenge detail + draw scoring, stub labels, soccer beta fetch all leagues, Stripe subscription webhooks in code.

---

## 1. Production billing

**Goal:** TestFlight / App Store users can subscribe via **RevenueCat**; web users via **Stripe**; tier stays in sync after renew/cancel.

### In the repo (done)

- RevenueCat SDK + paywall purchase/restore
- Backend `POST /api/v1/subscription/revenuecat/webhook`
- Stripe checkout + webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Checkout attaches `user_id` + `subscription_tier` on Stripe subscription metadata

### Your actions (required before #2)

#### A. Deploy API (if not already)

```bash
ssh root@198.211.109.76
cd ~/sport_prediction && git pull && scripts/deploy_api.sh
```

#### B. Server env (`~/sport_prediction/.env.production`)

Set and verify:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PREMIUM`, `STRIPE_PRICE_ID_PREMIUM_PLUS`
- `REVENUECAT_WEBHOOK_AUTH` (long random string)

#### C. Stripe Dashboard

1. Webhook endpoint: `https://api.octobetiq.com/api/v1/subscription/webhook`
2. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Two recurring **Prices** matching Premium ($29.99) and Pro ($9.99) — IDs must match env vars

#### D. RevenueCat Dashboard

1. iOS app linked to App Store Connect
2. Products / entitlements: `premium`, `pro` (names must match `REVENUECAT_ENTITLEMENT_*` on server)
3. Webhook: `https://api.octobetiq.com/api/v1/subscription/revenuecat/webhook`  
   Authorization header = same value as `REVENUECAT_WEBHOOK_AUTH`

#### E. EAS (mobile production build)

```bash
cd mobile
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_YOUR_KEY
# Android when ready:
# eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_YOUR_KEY
eas build --platform ios --profile production
```

#### F. Smoke test (real device, production API)

1. Register → log in  
2. Profile → Subscription → purchase Premium (sandbox Apple ID)  
3. Confirm tier updates in app  
4. Restore purchases  
5. (Optional) Stripe checkout on web → return URL → tier refresh  

**Reply when done:** `done with #1` (+ any blocker, e.g. “RC keys not ready”).

---

## 2. AdMob production ✅

Completed (build 21 + TestFlight). House promos or Google fill on free tier; Premium ad-free.

---

## 3. Push notifications ✅

*(Completed — cron + build 22+.)*

**Goal:** Users with push enabled receive game / high-confidence alerts; **tapping opens game detail**.

### In the repo (done)

- Token register/remove (`Settings`, login, `POST /user/push-token`)
- Backend `POST /internal/push-triggers/run` (game reminders + high-confidence)
- **Tap handler:** `pushNotificationHandlers.ts` → `GameDetail` via `game_id`
- Cron script: `scripts/cron/internal_push_triggers_run.sh` (see `deploy/crontab.example`)

EAS build already reported **Push Notifications are set up**.

### Your actions (required before #4)

#### A. Server env

In `~/sport_prediction/.env.production` (and `.env` for compose):

```
PUSH_CRON_SECRET=<long-random-string>
```

Must match what cron scripts use (same secret as predictions cron).

#### B. Install push cron on VPS

```bash
ssh root@198.211.109.76
chmod +x ~/sport_prediction/scripts/cron/internal_push_triggers_run.sh
crontab -e
# Add line from deploy/crontab.example:
# */15 * * * * /root/sport_prediction/scripts/cron/internal_push_triggers_run.sh >> /tmp/sport-prediction-cron.log 2>&1
```

#### C. Verify cron once

```bash
cd ~/sport_prediction && ./scripts/cron/internal_push_triggers_run.sh
# Expect JSON: {"game_reminders_sent":N,"high_confidence_picks_sent":M}
```

If **501**, `PUSH_CRON_SECRET` is missing on the API container env.

#### D. New mobile build (for tap-to-open)

Tap handling is in JS — needs **build 22+**:

```bash
cd mobile
npm run eas:build:ios
npm run eas:submit:ios
```

#### E. Smoke test (real iPhone, not simulator)

1. Log in → **Settings** → Push **on** (allow iOS permission)
2. Add a **favorite team** with a game starting soon (or wait for high-confidence cron)
3. Or trigger manually on server (with secret):

```bash
curl -fsS -X POST \
  -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  http://127.0.0.1:8000/internal/push-triggers/run
```

4. Tap notification → should open **Game detail** for that game

**Reply when done:** `done with #3` (or blocker).

---

## 4. For You feed ✅

---

**Goal:** Home “Best Picks for You” uses a personalized feed (favorite teams → favorite leagues → top confidence).

### In the repo (done)

- `GET /api/v1/feed/for-you` — ranks by favorites when logged in; guests get top-picks order
- Home `loadForYou()` calls `apiService.getForYouFeed()` (sends auth when present)

### Your actions (required before #5)

#### A. Deploy API

```bash
ssh root@198.211.109.76
cd ~/sport_prediction && git pull && scripts/deploy_api.sh
```

#### B. Smoke test

1. Log in with favorite team(s) set → Home carousel should prefer those matchups
2. Log out → section still loads (non-personalized top picks)

No new mobile build required (API-only change). Rebuild only if you want to ship other JS changes in the same binary.

**Reply when done:** `done with #4`

---

## 5. Player props ✅

---

**Goal:** Premium users see **honest model-projected** props (not fake sportsbook lines).

### In the repo (done)

- `GET /api/v1/games/{id}/player-props` — projections from game ML + optional `game_player_spotlights` names
- `GET /api/v1/feed/player-props` — Games tab feed (Premium)
- Fallback: team-level estimates (`KC featured scorer (model est.)`) when no spotlights
- Game detail + Games copy updated

### Not included (needs licensed feed later)

- Real sportsbook lines, injury-adjusted minutes, or player stat history ML

### Your actions (required before #6)

#### A. Deploy API

```bash
ssh root@198.211.109.76
cd ~/sport_prediction && git pull && scripts/deploy_api.sh
```

#### B. (Optional) Sync named players for a game

```bash
# On server or laptop with PUSH_CRON_SECRET
python3 scripts/sync_player_spotlights.py path/to/spotlights.json
```

JSON shape: `{ "game-uuid": [{ "player_name", "team_name", "role", "summary", "sort_order" }] }`

#### C. Smoke test (Premium account)

1. Open any NFL/NBA game with a prediction → **Player props** section shows projections
2. Games → **Props (preview)** tab (hidden during soccer-only beta)
3. Free tier → 403 / paywall CTA

**Reply when done:** `done with #5`

---

## 6. NFL/NBA real ML ✅

---

**Goal:** NFL/NBA use **ClearSports schedules** + **trained sklearn model** on finished games (not demo/synthetic labels).

### In the repo (done)

- ClearSports NFL/NBA sync (`POST /internal/us-sports/sync-schedules`)
- Features from recent finished games (`us_recent_form`) / standings when present
- Weekly train cron + `sklearn_simple` model (NFL + NBA in training set)
- Mobile: removed “demo model picks” copy; demo banner only for `_synthetic` model versions
- Cron scripts: safe env load (`_load_cron_env.sh`) — no broken `.env` `source`

### Already on VPS (from this session)

- **NFL:** 300 finished + 16 scheduled games synced
- **NBA:** 1,369 finished + 26 scheduled
- Model metrics: **294 NFL + 1,252 NBA** training games
- Predictions: `model_version=sklearn_simple`

### Your actions (required before #7)

#### A. Deploy latest code

```bash
ssh root@198.211.109.76
cd ~/sport_prediction && git pull && scripts/deploy_api.sh
```

#### B. Install NFL/NBA sync cron (if missing)

```bash
crontab -l | grep us_sports || echo '45 6,14,22 * * * /root/sport_prediction/scripts/cron/internal_us_sports_sync_schedules.sh >> /tmp/sport-prediction-cron.log 2>&1' | crontab -
```

#### C. Smoke test (app)

1. **Games → NFL** — real 2025 schedule, picks without yellow “demo” banner
2. **Games → NBA** — same
3. Open a game → explanation metrics mention **recent form**, not “demo”

Optional new mobile build to ship updated Games copy (`predictionTrust.ts`).

**Reply when done:** `done with #6`

---

## 7. Post-register auto login ✅

*(Build 23 / TestFlight — commit `dbe6cdb`.)*

---

## 8. Landing fallback picks ✅

*(Build 23 / TestFlight — commit `a9f5d97`.)*

---

## 9. Live in-play ML ← **next (deferred)**

**Goal:** In-game win-probability updates (not just pre-game predictions).

**Today:** Live tab polls game status; ML predictions are pre-kickoff only.

**Scope (when you want it):** live feature pipeline, in-play model or heuristic layer, WebSocket/push for score-state changes, mobile Live Hub UX.

Reply **`start #9`** when you want to tackle this, or name another priority (App Store submit, soccer season sync, etc.).

# Incomplete features — work one at a time

Work in this order. **Do not start the next item until you’ve completed the “Your actions” for the current one** and replied **“done with #N”** (or what you finished / what’s blocked).

| # | Feature | Code status | Who finishes it |
|---|---------|-------------|-----------------|
| **1** | [Production billing](#1-production-billing) | ✅ You confirmed done | — |
| **2** | [AdMob production](#2-admob-production) | ✅ You confirmed done | — |
| **3** | [Push notifications](#3-push-notifications) | ✅ You confirmed done | — |
| **4** | [For You feed](#4-for-you-feed) | API + Home wired | **You** (deploy API + optional build) |
| **5** | [Player props](#5-player-props) | Sample data | **Us** (needs data license) |
| **6** | [NFL/NBA real ML](#6-nflnba-real-ml) | Synthetic/demo | **Us** (sync + training) |
| **7** | [Post-register auto login](#7-post-register-auto-login) | Manual login today | **Us** (small) |
| **8** | [Landing fallback picks](#8-landing-fallback-picks) | Fake Lakers/Chiefs teasers | **Us** (small) |
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

## 4. For You feed ← **current**

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

## 5–9

See table above; we’ll expand each section when you reach that number.

# Octobet App Review

**Date:** 2026  
**Scope:** Full stack — backend (FastAPI), mobile (Expo/React Native), data/seed, docs.

---

## 1. What the app is

**Octobet** is a multi-sport prediction app: users see AI-generated picks (win probability, confidence), explanations, and optional live updates. It targets a “Multi-Sport Fan” persona with freemium (free tier with daily limit, premium for unlimited + live/props). Core flows: **Landing → Login/Register → Main app (Home, Live Hub, Games, Favorites, Profile)** with game detail, predictions, leaderboards, and account/settings.

---

## 2. Tech stack

| Layer | Stack |
|-------|--------|
| **Backend** | FastAPI, SQLAlchemy, SQLite (dev) / PostgreSQL, Redis (optional), JWT + bcrypt, rate limiting |
| **Mobile** | Expo SDK 54, React 19, React Native 0.81, React Navigation (stack + bottom tabs), Redux Toolkit |
| **Data** | Seed script for 10 leagues (NFL, NBA, MLB, NHL, soccer, boxing, tennis, golf, MMA); game statuses `scheduled` / `finished` |

---

## 3. Strengths

- **Auth & session:** Register/login, JWT + refresh, token in memory + AsyncStorage, 401 → refresh then retry. Logout/delete account correctly switch to unauthenticated stack (no `replace('Login')` from inside auth stack).
- **API surface:** Games (upcoming, by id, league/leagues), predictions with daily limit, explanations (real or stub), user/me, favorites (teams + leagues), prediction history, stats/accuracy, feed/top-picks, leaderboards, health/ready. Internal cron for push triggers.
- **Mobile UX:** Single navigator driven by `isAuthenticated`; Landing first when logged out; Live Hub tab; Leaderboards and Challenges (stub) from Profile; Share pick (text) on game detail. Dark theme, games cache, offline hint.
- **Security baseline:** Passwords hashed with bcrypt; JWT secret configurable; CORS and rate limits on auth/predictions; account deletion (GDPR-style).
- **Docs:** `WORKING_AND_NOT.md` and architecture docs give a clear “working vs not” and roadmap.

---

## 4. Gaps & risks

**Product / design**

- **No payments:** Paywall is UI only; no Stripe (or other) or 7-day trial. Backend already has `subscription_tier` and premium gating.
- **Challenges:** GET returns `[]`, POST returns 501; no create/join/complete flow.
- **Share:** Only text message; no share image (confidence %, logos).
- **For You / onboarding:** No personalized feed or onboarding wizard (design doc items).

**Backend**

- **JWT secret:** Default `jwt_secret` in config is a long dev string; production must set a strong secret via env.
- **Ready probe:** `/ready` fails if Redis is down; consider making Redis optional for readiness so app can run without it.
- **WebSocket:** No auth on `WS /ws/live/{game_id}`; design says premium-only — worth gating when hardening.

**Mobile**

- **Expo Go:** Push and some notification features are limited in Expo Go (SDK 53+); dev builds recommended for full push testing.
- **Theme consistency:** Some screens (e.g. AccuracyScreen, GameDetailScreen) still use hardcoded colors (#2196F3, #F5F5F5) instead of `theme`.
- **Error handling:** A few flows only `console.error` or swallow errors (e.g. ProfileScreen `loadUserInfo`); user-visible errors could be clearer.

**Data / ML**

- **Predictions:** Come from seed/ML pipeline; no in-app ingestion. Live predictions and WebSocket are stubs (latest pre-game).
- **Leaderboards:** Based on “viewed” picks (UserPredictionView); cold start with few finished games or views will show empty or sparse leaderboards.

---

## 5. Recommendations (priority)

1. **Production config:** Use env for `jwt_secret`, strong CORS, and (if needed) make Redis optional for `/ready`.
2. **Theme pass:** Replace remaining hardcoded colors in AccuracyScreen, GameDetailScreen (and any similar screens) with `theme` constants.
3. **Payments:** Add Stripe (or chosen provider) for Premium and 7-day trial; keep backend tier checks as-is.
4. **Share graphic:** Backend endpoint to generate share image (e.g. game + confidence + logos); mobile to use it in Share.
5. **Challenges:** Define minimal challenge model (e.g. “pick N games, compare to model”); implement create + list + resolve and wire UI.
6. **Optional:** Auth on WebSocket for live updates; For You feed and onboarding when prioritizing engagement.

---

## 6. Verdict

The app is in a **solid MVP state**: auth, games, predictions, feed, leaderboards, and core mobile flows work end-to-end. Stubs (challenges, share image, live pipeline) and missing payments are clearly scoped in the docs. Addressing config/theme and adding payments plus one or two “next step” features (e.g. share graphic, challenges) would make it production-ready for a limited launch.

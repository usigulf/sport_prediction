# App Review & What to Build Next

**Last updated:** After P3 push notifications (token registration + send pipeline).

---

## 1. Current State

### Working end-to-end

| Area | Status |
|------|--------|
| **Auth** | Register, login, logout; token in memory + AsyncStorage; **401 → refresh token then retry**, else logout |
| **Backend** | FastAPI on 0.0.0.0 (device can connect via LAN IP); SQLite default; health + ready; CORS |
| **Games** | Upcoming games (optional auth), game by ID, team serialization |
| **Predictions** | Latest per game; explanation stub; live-predictions stub (premium) |
| **User** | GET /user/me, GET/POST/DELETE favorites (teams); daily limit for free tier |
| **Mobile** | Home, Games, Favorites (API + add/remove team), Profile, Game Detail, Login/Register; backend status on login; auto port 8000/8001 |

### Optional / follow-up

- **Prediction history** — implemented (table, endpoint, mobile screen).
- **Live predictions** — endpoint exists; returns latest pre-game until a real live pipeline exists.
- **Explanation** — when `EXPLANATION_MODEL_DIR` is set, returns real feature importance; otherwise stub.
- **Games data** — run `./backend/seed.sh` (or `PYTHONPATH=backend python scripts/seed_data.py`) once for demos.

### Tech stack

- **Backend:** FastAPI, SQLAlchemy (GUID type for SQLite/Postgres), bcrypt, JWT, Redis (optional for cache).
- **Mobile:** Expo (React Native), Redux, React Navigation; Node 20+ required.
- **ML:** Present in repo (training/inference) but not wired to backend for real predictions or explanations.

---

## 2. Suggested Order: What to Build Next

### P1 – High impact, fast to ship

1. **Seed data (dev UX)** — **Done.** Run `cd backend && ./seed.sh` (or `PYTHONPATH=backend python ../scripts/seed_data.py`) so Home/Games show real games and predictions.

2. **Refresh token on 401** — **Done.** Store `refresh_token`; on 401 call `POST /auth/refresh`, update tokens, retry once; else logout.


4. **Friendlier error messages** — **Done.** `getUserFriendlyMessage()` maps API detail and status to user copy (daily limit, session expired, invalid credentials, premium required, etc.). Used in Login, Register, GameDetail (add favorite), Favorites, Prediction History, Home, and Games (alerts or inline).

### P2 – Product and trust

5. **Subscription / paywall (align with PredictIQ)** — **Done (UI).** Backend already enforces tier (free daily limit, premium-only live predictions). Mobile: Profile shows tier; “Subscription” opens Paywall screen with Free / Premium $9.99 / Pro $29.99, feature bullets, “Current plan” badge, and “Coming soon” CTA (no real payment yet).

6. **Historical accuracy (trust)** — **Done.** Backend: `GET /stats/accuracy` (no auth) computes prediction-vs-outcome for finished games (predicted winner vs actual); returns total_games, correct, accuracy_pct, by_league. Mobile: “Model accuracy” in Profile → AccuracyScreen (“How we’ve done”) with overall % and per-league breakdown.

7. **Real explanation from ML** — **Done (optional).** Backend loads the simple model from `EXPLANATION_MODEL_DIR` (dir with `simple_model.pkl` + `feature_columns.pkl`) when set; `GET /games/{id}/explanation` then returns the model’s **feature importance** as top factors (real factor names and weights). If the dir is not set or model missing, the existing stub explanation is used.

### P3 – Scale and polish

8. **Rate limiting** — **Done.** Per-IP limit on login, register, refresh (default 20/min); per-user or per-IP on prediction/explanation/live-predictions (default 120/min). Uses Redis when available, in-memory fallback. 429 response with friendly message; mobile maps 429 to “Too many requests. Please try again in a minute.”

9. **Push notifications (PredictIQ)** — **Done (foundation).** Backend: user_push_tokens table, POST/DELETE /user/push-token; push_service.send_expo_push() for sending. Mobile: expo-notifications, register token on login/restore. Triggers (e.g. game starting in 1 hour) can be added via cron.

10. **Offline / caching** — **Done.** Games list cached to AsyncStorage on fetch; restored on cold start; Home and Games show "Updated at …" or "Offline – showing cached data from …" when appropriate.

---

## 3. Future / next (optional)

All P1–P3 items above are done. Possible next steps:

- **Push triggers** — **Done.** Backend: `push_reminder_sent` table; `push_trigger_service.send_game_starting_reminders()` (games in 50–70 min, users with favorite team) and `send_high_confidence_picks()` (high-confidence predictions, upcoming games). Cron: `scripts/send_push_reminders.py`; or `POST /internal/push-triggers/run` with `X-Cron-Secret` (set `PUSH_CRON_SECRET`).
- **Settings screen** — **Done.** Profile "Settings" opens SettingsScreen with a "Push notifications" toggle; off calls `removePushToken()` and stores preference; on re-registers token. Login/restore only register push when the setting is enabled.
- **Help / FAQ** — **Done.** Profile "Help & FAQ" opens HelpScreen with FAQ (predictions, daily limit, high-confidence, accuracy, favorites) and a "Contact us" mailto button. "Contact Us" in Profile opens mailto:support@sportsprediction.com.

---

## 4. Quick reference

| Priority | Item | Why |
|----------|------|-----|
| **P1** | Seed data | So dev and demos show real games and predictions |
| **P1** | Refresh token on 401 | Fewer logouts when access token expires |
| **P1** | Prediction history (table + endpoint + UI) | “My history” and foundation for accuracy |
| **P1** | Friendlier error copy | Better UX and support |
| **P2** | Subscription checks + paywall UI | Align with PredictIQ tiers and revenue |
| **P2** | Historical accuracy endpoint + UI | Trust and differentiation |
| **P2** | Real ML explanation | “Why this prediction?” with real factors |
| **P3** | Rate limiting, push, offline | Scale and engagement |

---

## 5. Run checklist

- **Backend:** `cd backend && ./run.sh` (listens on 0.0.0.0, port 8000 or 8001).  
- **DB:** Default SQLite (`app.db`); tables created on startup. For real data, run seed (e.g. `cd backend && source .venv/bin/activate && python ../scripts/seed_data.py` or wire seed into backend/scripts).  
- **Mobile:** `cd mobile && nvm use && npm start` → press `w` for web; for device set `EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8000/api/v1` (or 8001).  
- **Docs:** Product/vision in [PredictIQ_ARCHITECTURE.md](PredictIQ_ARCHITECTURE.md); deep technical detail in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 6. Architecture design review & recommended next feature

**Source:** [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md) (production design baseline).

### Alignment with design

- **Core flows:** Auth, pre-game predictions, explanations (stub/optional ML), favorites (teams), prediction history, accuracy stats, paywall UI, push (tokens + triggers), offline cache, Settings, Help/FAQ are implemented and match the doc’s product vision and user personas.
- **API:** Games, predictions, explanation, live-predictions (stub), user/me, favorites (teams), prediction-history, push-token, stats/accuracy are in place. Score prediction (expected home/away) is already returned and shown in the app.
- **Gaps vs design:**
  - **Favorite leagues:** Design §2.1.4 and §4.3.1 specify “Favorite Teams/Leagues” and `POST /user/favorites/leagues`. Backend already stores `entity_type = 'league'` and returns leagues in `GET /user/favorites`, but there are **no** `POST`/`DELETE` for leagues, and the mobile app has no way to add or remove league favorites. FavoritesScreen only uses the first favorite league for loading games; users cannot manage which leagues are favorites.
  - **Player props:** Design §2.1.1 and §4.3.1 define player props and `GET /games/{gameId}/player-props`. Mobile has API methods for player props; backend has no routes (would 404). Design Phase 3 (Months 7–9) calls out player props as a premium feature.
  - **WebSocket live updates:** Design §4.3.2 and §5.4 describe `WS /ws/live/{gameId}` and a LiveUpdateService; currently only REST live-predictions stub exists. This is a larger Phase 2–style project.
  - **Compliance:** Design §6.2 (GDPR/CCPA) expects a clear, accessible Privacy Policy; Profile has a “Privacy Policy” entry but no dedicated screen or link to policy content.

### Recommended next feature: **Favorite leagues (add/remove + use in filtering)**

**Why this next**

1. **Directly from the design:** “Favorite Teams/Leagues” and `POST /user/favorites/leagues` are specified; the data model and GET response already support leagues—only the write API and UI are missing.
2. **Low effort, high consistency:** Backend needs two endpoints (`POST` and `DELETE` for a league code); mobile needs a way to add/remove leagues (e.g. in Favorites or a “Manage favorites” flow) and can optionally default Games/Home to “My leagues” when the user has league favorites.
3. **Improves Favorites and discovery:** Users can pin leagues (e.g. NFL, Premier League) and see games for those leagues in Favorites and, if implemented, in Games filter, matching the “Customized dashboard” idea in the design.

**Concrete steps**

- **Backend:** Add `POST /user/favorites/leagues/{league_code}` and `DELETE /user/favorites/leagues/{league_code}` (validate `league_code` against known leagues, e.g. from games or a fixed list). Reuse `UserFavorite` with `entity_type="league"` and `entity_id=league_code`.
- **Mobile:** In FavoritesScreen (or a dedicated “Manage leagues” section), add UI to add/remove league favorites (e.g. list of available leagues with toggle or “Add league” flow). Optionally: in GamesScreen, add a “My leagues” filter that uses the user’s favorite leagues when available.

### Other good next steps (in order)

- **Privacy Policy screen:** Add a simple screen (or WebView) for Privacy Policy and link it from Profile. Quick win for ARCHITECTURE_DESIGN §6.2 (GDPR/CCPA) and app store requirements.
- **Player props (stub + premium gate):** Add `GET /games/{gameId}/player-props` (and optionally `GET /players/{playerId}/props`) returning stub or empty list; enforce premium. In the app, show a “Player props” section on Game Detail (premium-gated). Unblocks the Fantasy Player persona and aligns with Phase 3 without requiring real ML yet.
- **WebSocket live updates:** Design-aligned but larger; tackle after the above for a clearer path to “live in-play” without blocking smaller wins.

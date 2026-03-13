# Live Updates, Realtime Predictions & Real Game Analysis

How to get **live updates**, **realtime prediction**, and **real game analysis** in Octobet — what exists today and what you need to add.

---

## 1. Live updates (WebSocket)

### What you have today

- **Endpoint:** `WS /ws/live/{game_id}` (backend `main.py`).
- **Auth:** JWT in query: `?token=<access_token>`. **Premium** tier required.
- **Behavior:** Every 30 seconds the server sends the **same** pre-game prediction + current game score from the DB. There is **no live data feed**; scores are only as current as whatever updates the `games` table (e.g. a cron or manual seed).

So you get:
- ✅ Real-time **delivery** (WebSocket push every 30s).
- ❌ Not **live data**: prediction is pre-game, scores are from DB only.

### How to get real live updates

1. **Live score feed**  
   Ingest real-time scores (e.g. Sportradar, ESPN, The Odds API) and write them to `games.home_score` / `games.away_score` (and set `status = 'live'` when the game starts). The existing WebSocket will then push those scores every 30s.

2. **Send JWT from the app**  
   Backend requires `?token=<access_token>`. The mobile app now passes the token in `mobile/src/hooks/useLiveUpdates.ts` via `getAuthToken()`. Ensure on app startup you restore the stored session and call `setAuthToken(…)` (e.g. from `authStorage`) so the WebSocket has a token after restart. Only connect when the user is **premium** (backend will close with "Premium required" otherwise).

3. **Optional: push more often or only on change**  
   Change the `asyncio.sleep(30)` loop in `main.py` to a shorter interval or to push only when score/prediction actually changes (e.g. after you update the DB from the live feed).

**Summary:** Live **updates** (push to the client) work; to make them **real** you need a live score pipeline + token in WebSocket URL.

---

## 2. Realtime prediction (in-play)

### What you have today

- **REST:** `GET /api/v1/games/{game_id}/live-predictions` (premium only).
- **WebSocket:** Same 30s loop; payload includes `home_win_probability`, `away_win_probability`, `confidence_level`.

Both return the **latest pre-game prediction** from the DB. There is **no in-play model**; win probabilities do not change during the game.

### How to get realtime in-play prediction

1. **In-play model**  
   Train or integrate a model that takes **in-game state** (score, time, possession, etc.) and outputs updated win probability (and optionally expected final score). This is a separate ML pipeline from your pre-game model.

2. **Live features**  
   You need a live data source that provides (per sport) the inputs your in-play model needs (e.g. score, quarter/inning, time remaining, key events). Same providers as in §1 (Sportradar, etc.) or a dedicated live stats API.

3. **Backend pipeline**  
   - **Option A:** A worker/cron that, every N seconds, fetches live state for “live” games, runs the in-play model, and writes results to a `live_predictions` table (or cache). The existing `GET /live-predictions` and WebSocket then read from that table/cache instead of the pre-game `predictions` table.
   - **Option B:** On-demand: when the client calls `GET /live-predictions` or when the WebSocket sends an update, compute in-play prediction on the fly (higher latency and load; only viable if inference is very fast).

4. **API contract**  
   Keep the current response shape so the app keeps working; only change the **source** of `home_win_probability` / `away_win_probability` / `confidence_level` from “latest pre-game” to “latest in-play”.

**Summary:** Realtime **delivery** is there; **realtime prediction** requires an in-play model + live features + a backend pipeline that writes or serves in-play probabilities.

---

## 3. Real game analysis (explanations)

### What you have today

- **Endpoint:** `GET /api/v1/games/{game_id}/explanation` (auth + daily limit for free; premium has full access).
- **Behavior:**
  - If `EXPLANATION_MODEL_DIR` is set and contains `simple_model.pkl` + `feature_columns.pkl`, the API returns **real** feature importance from that model (top factors that drive the prediction).
  - Otherwise it returns a **stub**: a short generic explanation based only on home/away win probability and confidence.

So you already have a path to “real” game analysis; it depends on the explanation model and config.

### How to get real game analysis

1. **Train an explainable model**  
   The repo expects a scikit-learn–style model with `feature_importances_` and a matching list of feature names (see `backend/app/services/explanation_service.py`). You can:
   - Use the existing `train_simple_model.py` (or equivalent) to produce `simple_model.pkl` and `feature_columns.pkl`.
   - Or use SHAP / another explainability layer and expose the same structure (feature name + importance + optional description).

2. **Configure the backend**  
   Set in env (e.g. `.env` or deployment config):
   ```bash
   EXPLANATION_MODEL_DIR=/path/to/dir/containing/simple_model.pkl/and/feature_columns.pkl
   ```
   Restart the API. The explanation endpoint will then return real top factors and descriptions (from `FEATURE_DESCRIPTIONS` or the model).

3. **Optional: per-game SHAP**  
   For “why **this** game?” (not just global importance), you’d add a SHAP (or LIME) step that computes feature contributions for the single prediction and return those in the same `top_features` shape. That would require extending `explanation_service.py` and the API response (same field names, richer semantics).

**Summary:** Real game analysis is supported; set `EXPLANATION_MODEL_DIR` and (optionally) add per-game SHAP for finer explanations.

---

## Quick checklist

| Goal                     | Today                          | To get it “real” |
|--------------------------|--------------------------------|-------------------|
| **Live updates**         | WebSocket every 30s, pre-game + DB scores | Live score ingestion → DB; add JWT to WebSocket URL in app |
| **Realtime prediction**  | Pre-game prediction repeated  | In-play model + live features + pipeline writing/serving in-play probabilities |
| **Real game analysis**  | Stub or real if model dir set  | Set `EXPLANATION_MODEL_DIR`; optionally add per-game SHAP |

---

## References in the repo

- WebSocket: `backend/app/main.py` → `websocket_live_updates`
- Live-predictions REST: `backend/app/api/v1/games.py` → `get_live_predictions`
- Explanations: `backend/app/api/v1/games.py` → `get_prediction_explanation`; `backend/app/services/explanation_service.py`
- Config: `backend/app/config.py` → `explanation_model_dir`; `backend/README.md` (EXPLANATION_MODEL_DIR)
- Mobile WebSocket: `mobile/src/hooks/useLiveUpdates.ts` (sends JWT in query when available)

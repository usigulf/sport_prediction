# SportOracle / Sport Prediction — Project Structure

High-level layout for the AI-powered sports prediction platform. **Target architecture:** [PredictIQ_ARCHITECTURE.md](PredictIQ_ARCHITECTURE.md). This file reflects the current codebase and aligns with that doc where implemented. See [ARCHITECTURE_COMPARISON.md](ARCHITECTURE_COMPARISON.md) for doc roles.

---

## Root layout

```
sport_prediction/
├── backend/                 # FastAPI backend (Python)
├── mobile/                  # React Native (Expo) app
├── ml/                      # ML training & inference (Python)
├── scripts/                 # One-off and dev scripts
├── package.json             # Root pnpm/turbo monorepo config
├── pnpm-workspace.yaml      # Workspace packages (apps/*, packages/*, services/*)
├── PredictIQ_ARCHITECTURE.md   # Canonical system architecture (use this first)
├── ARCHITECTURE_COMPARISON.md # Comparison of all architecture docs
├── ARCHITECTURE.md          # Technical reference (SportOracle; deep detail)
├── ARCHITECTURE_DESIGN.md   # Production design baseline
├── PROJECT_STRUCTURE.md     # This file
└── *.md                     # README, QUICK_START, TESTING_GUIDE, etc.
```

---

## 1. Backend (`backend/`)

FastAPI app: REST API, auth, games, predictions, optional ML integration.

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, router mounting
│   ├── config.py            # Settings (env, DB, Redis, etc.)
│   ├── database.py          # SQLAlchemy engine, session, Base
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py          # get_db, get_current_user, etc.
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py    # Aggregates v1 routes
│   │       ├── auth.py      # register, login, refresh, logout
│   │       ├── games.py     # upcoming, game by id, game detail
│   │       ├── user.py      # user profile, favorites
│   │       └── (future: predictions.py, players.py, analytics.py)
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py      # JWT, password hashing
│   │   └── exceptions.py    # HTTP exception handlers
│   │
│   ├── models/              # SQLAlchemy ORM
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── team.py
│   │   ├── game.py
│   │   └── prediction.py
│   │
│   ├── schemas/             # Pydantic request/response
│   │   ├── __init__.py
│   │   ├── common.py
│   │   ├── user.py
│   │   ├── game.py
│   │   └── prediction.py
│   │
│   ├── services/            # Business logic
│   │   ├── __init__.py
│   │   ├── cache_service.py # Redis (or in-memory fallback)
│   │   ├── prediction_service.py
│   │   └── (future: ml_service.py, live_service.py)
│   │
│   └── (optional) ml/       # Backend-side ML hooks (if not using separate service)
│       ├── feature_engineering/
│       │   └── team_features.py
│       └── inference/
│           └── pre_game_inference.py
│
├── alembic/                 # DB migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py
├── alembic.ini
├── tests/
│   ├── conftest.py          # client, db, test_user, test_game, auth_headers
│   ├── test_auth.py
│   ├── test_predictions.py
│   └── test_ml_service.py
├── Dockerfile
└── requirements.txt         # (add if not present)
```

---

## 2. Mobile app (`mobile/`)

React Native (Expo) client: screens, navigation, API, WebSocket, state.

```
mobile/
├── App.tsx                  # Provider (Redux), AppNavigator
├── app.json                 # Expo config
├── package.json
├── .env.example             # API base URL, etc.
│
└── src/
    ├── navigation/
    │   └── AppNavigator.tsx # Tabs + stacks
    │
    ├── screens/
    │   ├── HomeScreen.tsx
    │   ├── GamesScreen.tsx
    │   ├── GameDetailScreen.tsx
    │   ├── FavoritesScreen.tsx
    │   ├── ProfileScreen.tsx
    │   ├── LoginScreen.tsx
    │   └── RegisterScreen.tsx
    │
    ├── components/
    │   ├── GameCard.tsx
    │   ├── PredictionCard.tsx
    │   └── ExplanationView.tsx
    │
    ├── store/
    │   ├── store.ts         # configureStore
    │   ├── hooks.ts         # useAppDispatch, useAppSelector
    │   └── slices/
    │       ├── authSlice.ts
    │       └── gamesSlice.ts
    │
    ├── services/
    │   ├── api.ts           # REST client (fetch/axios)
    │   └── websocket.ts     # Live game updates
    │
    └── types/
        └── index.ts         # Game, Prediction, User, etc.
```

Optional later: `src/hooks/`, `src/utils/`, `src/constants/`, `src/theme/`.

**Target (PredictIQ):** feature-based layout under `src/features/` (e.g. `predictions/`, `live/`, `accuracy/`, `community/`, `profile/`, `auth/`) with `shared/` for components, hooks, api, theme. State: TanStack Query (server) + Zustand (client/live); see [PredictIQ_ARCHITECTURE.md](PredictIQ_ARCHITECTURE.md) §5.

---

## 3. ML pipeline (`ml/`)

Training, inference, and model artifacts (separate from backend runtime).

```
ml/
├── README.md                # How to train and run inference
│
├── training/
│   ├── train_simple_model.py   # Synthetic data + Random Forest (current)
│   └── (future)
│       ├── train_pregame.py    # Win probability (LightGBM/XGBoost)
│       ├── train_totals.py     # Over/under
│       ├── train_player_props.py
│       └── train_live.py       # Live/in-play (e.g. LSTM)
│
├── inference/
│   ├── simple_inference.py     # Load pkl, predict (current)
│   └── (future)
│       ├── pre_game_inference.py
│       ├── live_inference.py
│       └── explainability.py   # SHAP/LIME helpers
│
├── feature_engineering/       # (future) Shared feature logic
│   ├── team_features.py
│   ├── player_features.py
│   └── context_features.py
│
├── models/                     # Git-ignored or Git LFS
│   ├── simple_model.pkl
│   ├── feature_columns.pkl
│   └── (future) versioned artifacts (e.g. MLflow)
│
└── (optional) notebooks/       # EDA, experiments
```

Backend can call ML via HTTP (e.g. internal inference service) or by importing from `ml/` if run in the same repo.

---

## 4. Scripts (`scripts/`)

```
scripts/
└── seed_data.py             # Seed DB (teams, games, etc.)
```

Add as needed: `migrate.sh`, `docker-compose up` helpers, CI scripts.

---

## 5. Shared / monorepo (optional)

If you align with `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `services/*`):

- **apps/mobile** — move `mobile/` into `apps/mobile` so it’s part of the workspace.
- **packages/** — e.g. shared TypeScript types or API client used by mobile and a future web app.
- **services/** — e.g. standalone prediction or live-update service (Python/Node).

Current root `package.json` already has `mobile:start`, `mobile:ios`, `mobile:android`; if mobile stays at `mobile/`, you can keep those or point them at `apps/mobile` after moving.

---

## 6. Infrastructure / DevOps (future)

Not in repo by default; add when you adopt the full architecture:

```
infra/ or .github/ or deploy/
├── docker-compose.yml       # backend, redis, postgres (dev)
├── k8s/                    # Kubernetes manifests (optional)
├── terraform/ or cloud/    # IaC (optional)
└── CI (e.g. GitHub Actions)
    ├── backend: lint, test, build image
    ├── mobile: lint, test, build Expo
    └── ml: lint, unit tests, train on schedule
```

---

## 7. Quick reference

| Area           | Stack              | Purpose                          |
|----------------|--------------------|----------------------------------|
| **Backend**    | Python 3.11+, FastAPI | REST API, auth, games, predictions |
| **Mobile**     | React Native, Expo, Redux | iOS/Android client              |
| **ML**         | Python, sklearn (current), LightGBM/XGBoost (target) | Train & run models        |
| **DB**         | PostgreSQL, SQLAlchemy, Alembic | Persistent data          |
| **Cache**      | Redis (or in-memory) | Sessions, rate limit, prediction cache |
| **Realtime**   | WebSocket          | Live scores and live predictions |

---

## 8. Where to add new code

- **New API route** → `backend/app/api/v1/<resource>.py` + register in `router.py`.
- **New DB table** → `backend/app/models/<name>.py` + Alembic migration.
- **New screen** → `mobile/src/screens/<Name>Screen.tsx` + route in `AppNavigator`.
- **New ML model type** → `ml/training/train_<type>.py` and `ml/inference/<type>_inference.py`.
- **New shared type** → `mobile/src/types/index.ts` or a future `packages/types`.

This structure keeps backend, mobile, and ML clearly separated while matching the architecture described in `ARCHITECTURE.md` and `ARCHITECTURE_DESIGN.md`.

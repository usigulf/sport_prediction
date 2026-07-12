# Production reality (audit W2 / I28)

Short reference for investors and developers. **This is what runs in production today** — not the aspirational sections in [ARCHITECTURE.md](../ARCHITECTURE.md).

## Runtime

| Component | Production |
|-----------|------------|
| API | Single FastAPI app (`backend/`), 4 uvicorn workers on one VPS |
| Database | PostgreSQL + TimescaleDB extension on same VPS |
| Cache | Redis (requirepass) for rate limits, JWT denylist, WS pub/sub |
| ML inference | In-process **logistic regression** (per-league sklearn pickles in `ml/models/`) |
| Mobile | Expo React Native (iOS primary; Android project present) |
| Payments | Stripe (web) + RevenueCat / App Store (iOS) |
| Deploy | `scripts/deploy_api.sh`, Docker Compose |

## What we do **not** run in prod

- Kafka, Triton, Rust microservices (`archive/`)
- Multi-region HA, Kubernetes autoscaling
- Ensemble / deep learning models (marketing must not imply otherwise)
- Historical closing-line database (live odds snapshot only when API keys configured)

## ML honesty

- Soccer: native 1X2 model where trained; US sports: binary home/away
- `prediction_source` field gates heuristic picks in production UI
- Artifact BOM + health: `docs/MODEL_ARTIFACT_BOM.md`, `GET /health` model block, `GET /api/v1/stats/model`
- Public accuracy: `GET /api/v1/stats/public-audit`, walk-forward backtest script
- Do **not** market unsourced “win more” claims; holdout metrics in sample `metrics.json` are near a naive baseline

## Key API surfaces (audit-complete)

- Privacy: `GET /user/me/export`, `POST /user/me/privacy/ccpa-opt-out`
- Search: `GET /games/search`
- Transparency: `GET /stats/model-vs-market`, `POST /tools/parlay-correlation`
- Config: `GET /config/feature-flags` (server experiments)
- Widget: `GET /feed/widget/top-pick` (public JSON for iOS WidgetKit)
- Mobile server state: React Query hooks (`useSubscriptionTier`, `useGameDetailQuery`)

## OpenAPI

- Disabled on public prod API (`OPENAPI_DOCS_ENABLED=false`)
- Schema exported via `python backend/scripts/export_openapi.py` → `docs/openapi.json`

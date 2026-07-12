# Archived code (not used in production)

This directory holds **superseded** experiments and microservice scaffolds. Do not import or deploy from here.

## What moved here (P2-005)

| Path | Was | Canonical replacement |
|------|-----|------------------------|
| `archive/ml/training/train_simple_model.py` | Synthetic Random Forest demo | `backend/train_model.py` + `app/services/model_training.py` |
| `archive/ml/inference/simple_inference.py` | Standalone pkl loader | `app/services/ml_artifacts.py` + `prediction_inference_service.py` |
| `archive/services/predictions/` | Rust predictions microservice (never wired to prod) | FastAPI `backend/app/api/v1/` + internal prediction job |
| `archive/apps-mobile/` | Experimental Expo Router client at `apps/mobile/` | Canonical Expo app at repo-root `mobile/` |

## Active ML stack (2026)

- **Train:** `cd backend && python train_model.py --out ../ml/models`
- **Backtest:** `cd backend && python walk_forward_backtest.py`
- **Artifacts:** `ml/models/{football,basketball,soccer}/` (mounted at `/models` in Docker)
- **Inference:** `POST /internal/predictions/run` or cron `scripts/cron/internal_predictions_run.sh`

## Go user service

`services/users/` (Go) is also **not** deployed; auth and users live in the FastAPI backend. See `services/users/README.md`. Only the Rust predictions crate was archived in P2-005.

# Model artifact bill of materials (BOM)

Release honesty for ML inference (external audit Critical/High #3–4).

## What production mounts

Docker Compose mounts `./ml/models` → `/models` (`EXPLANATION_MODEL_DIR=/models`).  
Trained pickles must live **there** (or in league-group subdirs like `football/`, `soccer/`), not only under `backend/models/` (schema examples).

Expected files per ready group:

| File | Role |
|------|------|
| `simple_model.pkl` | Calibrated sklearn estimator |
| `feature_columns.pkl` | Ordered feature names |
| `metrics.json` | Eval + `publish_ready` gate |

## Env flags

| Variable | Default | Meaning |
|----------|---------|---------|
| `EXPLANATION_MODEL_DIR` / `MODEL_ARTIFACT_DIR` | unset | Artifact root |
| `ALLOW_HEURISTIC_INFERENCE` | `true` | If no publish-ready model, write heuristic picks |
| `REQUIRE_PUBLISH_READY_MODEL` | `false` | If `true`, `GET /health` returns **503** until artifacts are ready |

Recommended production once artifacts are deployed:

```bash
EXPLANATION_MODEL_DIR=/models
ALLOW_HEURISTIC_INFERENCE=false
REQUIRE_PUBLISH_READY_MODEL=true
```

## Verify

```bash
# Public health (includes model block)
curl -sS http://127.0.0.1:8000/health | python3 -m json.tool

# Public readiness
curl -sS http://127.0.0.1:8000/api/v1/stats/model | python3 -m json.tool

# Full BOM (cron secret)
curl -sS -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  http://127.0.0.1:8000/internal/model-bom | python3 -m json.tool
```

## Train into the mounted path

```bash
cd backend
python train_model.py --out ../ml/models
# Docker host: scripts/cron/internal_train_model.sh
```

## Honesty notes

- `backend/models/metrics.json` in git is a **schema example**, not live production evidence.
- Holdout ~58% accuracy / ~0.69 log loss is near a naive binary baseline — do not market as “AI picks that win more.”
- UI already labels `prediction_source` (sklearn vs heuristic); keep that visible.

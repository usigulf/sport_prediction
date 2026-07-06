# ML artifacts directory

Production ML runs through the **FastAPI backend**, not scripts in this folder.

## Train models

```bash
cd backend
python train_model.py --out ../ml/models
# Docker: scripts/cron/internal_train_model.sh  (writes to ml/models on host)
```

Writes per-league-group artifacts under `ml/models/{football,basketball,soccer}/`:
`simple_model.pkl`, `feature_columns.pkl`, `metrics.json`.

## Walk-forward backtest

```bash
cd backend
python walk_forward_backtest.py --min-train 60 --test-window 20
```

## Configure API

Set `MODEL_ARTIFACT_DIR` (or `EXPLANATION_MODEL_DIR`) to the absolute path of `ml/models` and restart the API.

## Archived legacy scripts

Synthetic-data demos and standalone inference loaders live under `archive/ml/` — see `archive/README.md`.

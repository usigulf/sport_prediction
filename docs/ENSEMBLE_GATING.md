# Ensemble gating (I99)

Production inference uses **one calibrated logistic regression per league group** (football, basketball, soccer). Stacked ensembles are **not** deployed by default.

## Gate

`ensemble_gating_service.assess_ensemble_eligibility()` reads walk-forward backtest output and requires:

- `mean_log_loss` at least **0.01** better than a documented single-model baseline per group.

Until that threshold is met, `metrics.json` includes:

```json
{
  "ensemble_eligible": false,
  "ensemble_gate_reason": "insufficient_lift"
}
```

## Workflow

1. Run `python backend/walk_forward_backtest.py` (or internal job).
2. Inspect `GET /api/v1/stats/model` → `ensemble_gate` block.
3. Only after proven lift: train ensemble artifacts in a separate experiment branch (not enabled in this repo's default train path).

## Marketing alignment

Do not claim "ensemble AI" in App Store copy while `ensemble_eligible` is false. See `docs/PRODUCTION_REALITY.md`.

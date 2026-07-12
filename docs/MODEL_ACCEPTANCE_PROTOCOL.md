# Model acceptance protocol (soccer wedge)

External audit task **#8**: chronological holdout, naive/market baseline, calibration, intervals, rollback — before charging on performance claims.

This is the **product gate**, not just “files exist on disk.” Artifact BOM details: [MODEL_ARTIFACT_BOM.md](./MODEL_ARTIFACT_BOM.md).

## Launch wedge

**Sport:** soccer (native 1X2).  
**Beta data scope:** Premier League sync (`SOCCER_SYNC_LEAGUES=premier_league`).  
**Mobile:** `EXPO_PUBLIC_BETA_SOCCER_ONLY=true` (hides NFL/NBA).

Do not expand marketing to NFL/NBA until those groups independently pass the same protocol.

## Acceptance levels

| Level | Intent | Must pass |
|-------|--------|-----------|
| `engineering_beta` | Internal builds | Artifact dir configured; `prediction_source` honesty; soccer-only mobile flag when asserted |
| `invite_beta` | Invite-only TestFlight / Play internal | Soccer `publish_ready` artifacts; chronological holdout ≥50 games; holdout log-loss **beats** uniform 1X2 baseline (−ln⅓ ≈ 1.0986); `ALLOW_HEURISTIC_INFERENCE=false`; `REQUIRE_PUBLISH_READY_MODEL=true`; `/health` healthy |
| `public_charge` | Charge / performance marketing | All invite gates + holdout ≥100; live calibration `min_sample_met` with ≥100 scored picks; **and** market/CLV baseline (currently **blocked** until historical closing lines are stored) |

**Today’s honest status:** invite beta is the ceiling once soccer pickles are deployed and env flags are fail-closed. `public_charge` will fail the market baseline check by design until a closing-line ledger exists.

## Chronological holdout

Training orders finished games by `scheduled_time` ascending and evaluates the chronological tail (`split: chronological_tail` in `metrics.json` eval). Soccer eval includes:

- `holdout_games` / `test_games`
- `log_loss`, `baseline_log_loss` (uniform 1X2)
- `beats_uniform_baseline`

Walk-forward (ops / research):

```bash
cd backend
python walk_forward_backtest.py --min-train 60 --test-window 20
```

## Market baseline (deferred)

Historical closing lines are **not** in the database. Live model-vs-consensus is monitoring only:

- `GET /api/v1/stats/model-vs-market`
- `/model-vs-market.html`

Passing `public_charge` requires a persisted closing-line ledger and a CLV / market-log-loss comparison. Until then, do **not** market “beats the market” or charge $29.99 on AI performance claims.

## Calibration

Live reliability diagram: `GET /api/v1/stats/calibration` (min sample 100). Required for `public_charge`.

## Prediction intervals

API probabilities are point estimates (calibrated logistic / 1X2). Do not claim prediction intervals or uncertainty bands in App Store / web copy until an interval method is shipped and acceptance-tested.

## Rollback

1. Before promoting new pickles: `cp -a ml/models ml/models.prev`
2. Deploy new artifacts under `ml/models` (Compose mounts → `/models`)
3. If `/health` returns 503 or acceptance regresses: `rm -rf ml/models && cp -a ml/models.prev ml/models` and restart API
4. Re-check:

```bash
curl -sS https://api.octobetiq.com/health | python3 -m json.tool
curl -sS 'https://api.octobetiq.com/api/v1/stats/model-acceptance?level=invite_beta' | python3 -m json.tool
```

## Verify (CLI)

```bash
# Against a metrics tree (local)
EXPLANATION_MODEL_DIR=/path/to/ml/models \
ALLOW_HEURISTIC_INFERENCE=false \
REQUIRE_PUBLISH_READY_MODEL=true \
python scripts/verify_model_acceptance.py --level invite_beta

# Against production API
python scripts/verify_model_acceptance.py --level invite_beta --api https://api.octobetiq.com
```

## API

- `GET /api/v1/stats/model-acceptance?level=invite_beta`
- `GET /api/v1/stats/model` (includes `soccer_wedge`)
- `GET /internal/model-bom` (cron secret)

## Production env (invite beta)

```bash
EXPLANATION_MODEL_DIR=/models
ALLOW_HEURISTIC_INFERENCE=false
REQUIRE_PUBLISH_READY_MODEL=true
SOCCER_SYNC_LEAGUES=premier_league
```

Train into the mount:

```bash
cd backend && python train_model.py --out ../ml/models
# or scripts/cron/internal_train_model.sh on the host
```

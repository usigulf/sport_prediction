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
| `public_charge` | Charge / performance marketing | All invite gates + holdout ≥100; live calibration `min_sample_met` with ≥100 scored picks; closing-line ledger ≥50 games and model log-loss ≤ closing market |

**Today’s honest status:** invite beta is the ceiling until soccer pickles are deployed, env is fail-closed, and the closing-line ledger has enough scored games for `public_charge`.

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

## Market baseline (closing-line ledger)

Odds snapshots accumulate from market-odds fetches (`odds_snapshots`). Near kickoff, cron freezes the last pre-kickoff row as `is_closing=true`.

```bash
# Freeze closing lines (cron secret)
curl -sS -X POST -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  -H "Content-Type: application/json" -d '{}' \
  http://127.0.0.1:8000/internal/odds/freeze-closing

# Score sklearn picks vs closing consensus
curl -sS https://api.octobetiq.com/api/v1/stats/model-vs-closing | python3 -m json.tool
```

**`public_charge` market gate** requires ≥50 finished games with closing + sklearn pick where model mean log-loss ≤ market mean log-loss.

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

Full VPS cutover order: [INVITE_BETA_OPS.md](./INVITE_BETA_OPS.md).

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

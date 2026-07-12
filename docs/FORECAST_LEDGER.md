# Append-only forecast ledger

Auditable issued picks for the soccer wedge (external review days 31–60).

## Why

`predictions` already inserts new rows on each job run, but the product needs a
**verifiable issuance record**: timestamped probabilities, model version,
`prediction_source`, and a content-hash chain that can be checked independently
of UI display.

## What gets written

Every successful prediction job write appends one `forecast_ledger_entries` row:

| Field | Meaning |
|-------|---------|
| `sequence` | Monotonic global counter |
| `issued_at` | Forecast timestamp (may be pre-kickoff backfill time) |
| `wall_clock_at` | When the ledger row was written |
| `kickoff_at` | Game scheduled time |
| `model_version` / `prediction_source` / `prediction_type` | Honesty labels |
| `home_win_probability` / `away_win_probability` | Issued probs |
| `content_hash` | SHA-256 of canonical JSON + previous hash |
| `prev_content_hash` | Prior entry hash (chain) |

Postgres migration **019** installs a trigger that **rejects UPDATE/DELETE**.

## API

```bash
# Summary + chain health
curl -sS https://api.octobetiq.com/api/v1/stats/forecast-ledger | python3 -m json.tool

# Per-game history
curl -sS https://api.octobetiq.com/api/v1/games/$GAME_ID/forecast-ledger | python3 -m json.tool

# Ops: full chain verify (cron secret)
curl -sS -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  http://127.0.0.1:8000/internal/forecast-ledger/verify
```

## Ops

```bash
alembic upgrade head   # applies 019
```

## Related

- Feature PIT snapshots: `game_feature_snapshots` / `GET /stats/feature-store`
- Closing lines: `docs/MODEL_ACCEPTANCE_PROTOCOL.md`, `GET /stats/model-vs-closing`
- Data telemetry: `docs/DATA_TELEMETRY.md`, `GET /stats/data-telemetry`
- Accuracy still locks on pre-game predictions via `select_pregame_prediction_for_accuracy`

# Data lineage & freshness telemetry

External audit **#13**: lineage, replay, freshness, provider-error, and feature-coverage telemetry for the soccer wedge.

## What ships

| Piece | Role |
|-------|------|
| `provider_sync_events` (migration **020**) | Persisted sync/job attempts + classified errors |
| `GET /api/v1/stats/data-telemetry` | Public freshness SLOs, feature coverage, sync error summary |
| `GET /api/v1/games/{id}/lineage` | Odds → features → predictions → ledger timeline + PIT **replay** |
| `GET /internal/data-telemetry/detail` | Ops detail (cron secret) |
| Prometheus | `provider_sync_total`, `provider_errors_total`, `data_freshness_hours` |

## Freshness resources

Informational SLO ages (hours) — not marketing claims:

- `team_standings` — 36h
- `game_feature_snapshots` — 24h
- `odds_snapshots` — 12h
- `forecast_ledger_entries` — 24h

## Feature coverage

Compares recent PIT snapshots against `FEATURE_COLUMNS` in `model_training.py` (nine team-level features). Reports mean coverage % and per-key present %.

## Replay

`GET /games/{id}/lineage` → `replay` returns the feature vector linked to the latest prediction with a snapshot, for offline re-scoring. Full Parquet warehouse export remains future work.

## Ops

```bash
alembic upgrade head   # applies 020

curl -sS https://api.octobetiq.com/api/v1/stats/data-telemetry | python3 -m json.tool

curl -sS -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  http://127.0.0.1:8000/internal/data-telemetry/detail | python3 -m json.tool
```

Sync endpoints (`/internal/soccer/sync-schedules`, `/us-sports/sync-schedules`, `/predictions/run`) record events automatically.

## Related

- Forecast ledger: `docs/FORECAST_LEDGER.md`
- Feature store: `GET /stats/feature-store`
- Standings coverage: `GET /stats/coverage`

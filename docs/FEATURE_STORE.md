# Feature store (I91)

## What ships

Point-in-time feature vectors are persisted to Postgres on each **pre-game prediction job** write:

- Table: `game_feature_snapshots`
- Service: `backend/app/services/feature_store_service.py`

Each row stores:

- `feature_source` (e.g. `us_pit_standings`, `soccer_pit_standings`)
- `model_version`
- Full JSON feature dict used for inference

## API

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /stats/feature-store` | Public | Aggregate snapshot counts |
| `GET /games/{id}/feature-snapshots` | Public | Per-game history (audit / transparency) |

## Future

- Offline export to Parquet for training replays
- Feature versioning keyed by `ml_model_version`

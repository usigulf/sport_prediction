# Load and chaos drills (audit #18)

How to exercise API/WS load and staging chaos without claiming production certification.

## Safety

- Prefer **staging** (`scripts/run_staging_local.sh`, port **8001**, DB `sportsprediction_staging`).
- Never point burst load at production without an explicit maintenance window.
- `DRY_RUN=1` prints planned steps and exits 0 (CI-safe).

## API HTTP load

```bash
# Dry run
DRY_RUN=1 bash scripts/load_test_api.sh

# Against local staging
API_URL=http://127.0.0.1:8001 \
  CONCURRENCY=20 \
  REQUESTS=200 \
  bash scripts/load_test_api.sh
```

Hits `/health`, `/ready`, and `/api/v1/stats/data-telemetry` (public, read-only). Reports counts, failures, and approximate p95 wall time.

## WebSocket load

```bash
DRY_RUN=1 python3 scripts/load_test_ws.py

API_URL=http://127.0.0.1:8001 \
  GAME_ID=<uuid> \
  WS_CLIENTS=10 \
  python3 scripts/load_test_ws.py
```

Opens N connections to `/ws/live/{game_id}` and waits for the first JSON message (or timeout). Auth-optional for guest-capable games; set `WS_TOKEN` when the hub requires it.

## Chaos (staging)

```bash
DRY_RUN=1 bash scripts/chaos_drill_staging.sh
bash scripts/chaos_drill_staging.sh
```

Default scenarios (compose stack):

1. Restart API container → wait for `/health`
2. Brief Redis restart → confirm `/ready` recovers
3. Confirm health probe script still green

Does **not** drop production Postgres. DB restore chaos is `docs/RESTORE_DRILL.md`.

## Optional k6

```bash
# requires: brew install k6  (or https://k6.io)
API_URL=http://127.0.0.1:8001 k6 run load/k6/api_smoke.js
```

## Capacity notes

See `docs/SLO_AND_CAPACITY.md` for invite-beta planning numbers and scale triggers. After each real run, fill the run log table there.

## Verify scaffold

```bash
bash scripts/verify_slo_scaffold.sh
```

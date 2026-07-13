# SLOs and capacity (audit #18)

In-repo **self-audit scaffold** for invite-beta reliability targets.

> This closes external audit **#18** as documented SLOs, load/chaos/capacity
> scripts, and a restore-drill cross-link. **It is not evidence that production
> has passed a sustained load or chaos campaign** — operators must run the
> scripts against staging/production-like environments and record results.

## Invite-beta SLOs (targets)

| SLO | Target | Measurement |
|-----|--------|-------------|
| API availability | ≥ 99.0% / 30d | External or cron probe of `/health` + `/ready` (`scripts/check_api_health.sh`) |
| Read latency (p95) | ≤ 500 ms | `/health`, `/api/v1/feed/*` under load script |
| Auth latency (p95) | ≤ 800 ms | Login/refresh paths (manual or authenticated load) |
| Live WS join | ≤ 2 s to first snapshot | `scripts/load_test_ws.py` |
| Data freshness | Per `docs/DATA_TELEMETRY.md` ages | `GET /api/v1/stats/data-telemetry` |
| Backup RTO | ≤ 60 min staging restore | `docs/RESTORE_DRILL.md` |

Error budget (invite-beta): **~7.2 h downtime / 30 days** at 99.0%. Burn alerts are ops-owned (UptimeRobot / Better Stack / cron + log).

## Capacity assumptions (single VPS)

| Resource | Invite-beta assumption | Scale trigger |
|----------|------------------------|---------------|
| Concurrent API clients | ≤ 50 steady, ≤ 150 burst | Sustained p95 > SLO or 5xx spike |
| Concurrent live WS | ≤ 100 (hub + Redis pub/sub) | Connection limit errors / hub lag |
| Postgres | Single Docker volume | Switch to managed Postgres (I51) before paid scale |
| Redis | Required in prod (JWT / rate limits / WS) | Failover per `docs/HA_AND_SCALING.md` |

These are **planning numbers**, not measured production proof. Record actuals in the run log below after each drill.

## What to run

| Drill | Command |
|-------|---------|
| API load (staging) | `API_URL=http://127.0.0.1:8001 bash scripts/load_test_api.sh` |
| WS load (staging) | `API_URL=http://127.0.0.1:8001 python3 scripts/load_test_ws.py` |
| Chaos (staging) | `DRY_RUN=1 bash scripts/chaos_drill_staging.sh` then live without `DRY_RUN` |
| Backup restore | `docs/RESTORE_DRILL.md` |
| Dry-run only | `DRY_RUN=1` on load/chaos scripts |

Optional k6 (if installed): `k6 run load/k6/api_smoke.js`

## Run log template

| Field | Value |
|-------|-------|
| Date (UTC) | |
| Environment | staging / prod-like |
| Peak RPS / VUs | |
| p95 latency | |
| Error rate | |
| Chaos scenario | |
| Pass / fail vs SLO | |
| Operator | |

## Related

- `docs/LOAD_AND_CHAOS.md`
- `docs/PROMETHEUS_METRICS.md`
- `docs/HA_AND_SCALING.md`
- `docs/DATA_TELEMETRY.md`
- `docs/RESTORE_DRILL.md`

## Verify (no live traffic)

```bash
bash scripts/verify_slo_scaffold.sh
bash scripts/verify_audit_scaffolds.sh
```

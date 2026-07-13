#!/usr/bin/env bash
# Verify SLO / load / chaos scaffold (external audit #18). Does not generate live traffic.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for f in \
  docs/SLO_AND_CAPACITY.md \
  docs/LOAD_AND_CHAOS.md \
  docs/PROMETHEUS_METRICS.md \
  docs/HA_AND_SCALING.md \
  docs/RESTORE_DRILL.md \
  docs/DATA_TELEMETRY.md \
  scripts/load_test_api.sh \
  scripts/load_test_ws.py \
  scripts/chaos_drill_staging.sh \
  scripts/check_api_health.sh \
  scripts/check_uptime.sh \
  scripts/restore_drill_staging.sh \
  load/k6/api_smoke.js \
  monitoring/prometheus/prometheus.yml
do
  if [[ ! -f "$f" ]]; then
    echo "FAIL missing $f"
    exit 1
  fi
done

python3 <<'PY'
from pathlib import Path

needles = {
    "docs/SLO_AND_CAPACITY.md": (
        "not evidence that production",
        "API availability",
        "p95",
        "load_test_api.sh",
        "chaos_drill_staging.sh",
        "RESTORE_DRILL",
    ),
    "docs/LOAD_AND_CHAOS.md": (
        "DRY_RUN",
        "load_test_ws.py",
        "staging",
        "k6",
    ),
    "scripts/load_test_api.sh": ("DRY_RUN", "CONCURRENCY", "/health"),
    "scripts/load_test_ws.py": ("DRY_RUN", "/ws/live", "WS_CLIENTS"),
    "scripts/chaos_drill_staging.sh": ("DRY_RUN", "restart", "/health"),
    "load/k6/api_smoke.js": ("http_req_duration", "/health"),
    "scripts/check_uptime.sh": ("check_api_health.sh",),
}
for path, tids in needles.items():
    text = Path(path).read_text(encoding="utf-8")
    for tid in tids:
        if tid not in text:
            raise SystemExit(f"missing {tid!r} in {path}")
print("OK  slo scaffold (SLOs, load, chaos, capacity, uptime alias)")
PY

# Smoke dry-runs (no network dependency)
DRY_RUN=1 bash scripts/load_test_api.sh
DRY_RUN=1 python3 scripts/load_test_ws.py
DRY_RUN=1 bash scripts/chaos_drill_staging.sh

echo "[slo-verify] Done."

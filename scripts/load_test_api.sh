#!/usr/bin/env bash
# Concurrent HTTP load against public read endpoints (audit #18).
# Prefer staging. DRY_RUN=1 prints plan without traffic.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN="${DRY_RUN:-0}"
API_URL="${API_URL:-http://127.0.0.1:8001}"
CONCURRENCY="${CONCURRENCY:-10}"
REQUESTS="${REQUESTS:-100}"
TIMEOUT_SEC="${TIMEOUT_SEC:-10}"
PATHS=(
  /health
  /ready
  /api/v1/stats/data-telemetry
)

log() { printf '[load-api] %s\n' "$*"; }

if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN: would hit ${API_URL} paths=${PATHS[*]} concurrency=${CONCURRENCY} requests=${REQUESTS}"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

log "target=${API_URL} concurrency=${CONCURRENCY} requests=${REQUESTS}"

worker() {
  local id="$1"
  local out="${TMP}/w${id}.tsv"
  : >"${out}"
  local i=0
  while (( i < REQUESTS / CONCURRENCY + (id < REQUESTS % CONCURRENCY ? 1 : 0) )); do
    local path="${PATHS[$((i % ${#PATHS[@]}))]}"
    local start end ms code
    start="$(python3 -c 'import time; print(time.time())')"
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${TIMEOUT_SEC}" "${API_URL}${path}" || echo 000)"
    end="$(python3 -c 'import time; print(time.time())')"
    ms="$(python3 -c "print(int((${end}-${start})*1000))")"
    printf '%s\t%s\t%s\n' "${code}" "${ms}" "${path}" >>"${out}"
    i=$((i + 1))
  done
}

pids=()
for ((c = 0; c < CONCURRENCY; c++)); do
  worker "$c" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do
  wait "${pid}" || true
done

python3 - "${TMP}" <<'PY'
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
rows = []
for path in root.glob("w*.tsv"):
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        code, ms, ep = line.split("\t")
        rows.append((int(code), int(ms), ep))

if not rows:
    raise SystemExit("no samples collected")

lat = sorted(r[1] for r in rows)
ok = sum(1 for c, _, _ in rows if 200 <= c < 400)
fail = len(rows) - ok
p95 = lat[max(0, int(len(lat) * 0.95) - 1)]
avg = sum(lat) / len(lat)
print(f"[load-api] samples={len(rows)} ok={ok} fail={fail} avg_ms={avg:.0f} p95_ms={p95}")
if fail / len(rows) > 0.05:
    raise SystemExit("FAIL error rate > 5%")
if p95 > 2000:
    raise SystemExit(f"FAIL p95 {p95}ms exceeds soft gate 2000ms (tighten for invite-beta SLO)")
print("[load-api] Done.")
PY

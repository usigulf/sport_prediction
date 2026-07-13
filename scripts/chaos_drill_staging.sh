#!/usr/bin/env bash
# Staging chaos drill (audit #18): restart API/Redis and re-check health.
# Prefer staging compose. DRY_RUN=1 prints steps only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN="${DRY_RUN:-0}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
API_SERVICE="${API_SERVICE:-api}"
REDIS_SERVICE="${REDIS_SERVICE:-redis}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8001/health}"
READY_URL="${READY_URL:-http://127.0.0.1:8001/ready}"
WAIT_SEC="${WAIT_SEC:-45}"

log() { printf '[chaos] %s\n' "$*"; }

run() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN: $*"
  else
    log "run: $*"
    eval "$@"
  fi
}

wait_http() {
  local url="$1"
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN: would wait for ${url}"
    return 0
  fi
  local i=0
  while (( i < WAIT_SEC )); do
    if curl -fsS --max-time 3 "${url}" >/dev/null 2>&1; then
      log "OK ${url}"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  log "FAIL: ${url} not healthy within ${WAIT_SEC}s"
  return 1
}

log "compose=${COMPOSE_FILE} health=${HEALTH_URL}"

run "docker compose -f '${COMPOSE_FILE}' restart '${API_SERVICE}'"
wait_http "${HEALTH_URL}"

run "docker compose -f '${COMPOSE_FILE}' restart '${REDIS_SERVICE}'"
# Give Redis a moment, then ready probe (may depend on Redis in prod config)
if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN: sleep 3 && curl ready"
else
  sleep 3
fi
wait_http "${READY_URL}" || wait_http "${HEALTH_URL}"

run "API_URL='${HEALTH_URL%/health}' bash '${ROOT}/scripts/check_api_health.sh'"

log "Record results in docs/SLO_AND_CAPACITY.md run log."
log "Done."

#!/usr/bin/env bash
# Train sklearn model from finished games → ml/models (API reads at /models in Docker).
# Schedule weekly after standings/results sync (see deploy/crontab.example).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi
if [[ -f .env.production ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env.production
  set +a
fi
BASE="${API_INTERNAL_URL:-http://127.0.0.1:8000}"
MIN_GAMES="${MODEL_TRAIN_MIN_GAMES:-60}"
FORCE="${MODEL_TRAIN_FORCE:-false}"
REFRESH_PREDICTIONS="${MODEL_TRAIN_REFRESH_PREDICTIONS:-true}"
LOG_PREFIX="[$(date -u +%Y-%m-%dT%H:%M:%SZ) train-model]"

echo "${LOG_PREFIX} starting (min_games=${MIN_GAMES} force=${FORCE})"

# Do NOT write to /models here — docker-compose mounts ./ml/models at /models:ro on the
# api service, and compose run inherits that. Use a separate rw mount at /model-out.
TRAIN_ARGS=(python train_model.py --out /model-out --min-games "${MIN_GAMES}")
if [[ "${FORCE}" == "true" || "${FORCE}" == "1" ]]; then
  TRAIN_ARGS+=(--force)
fi

_run_predictions_refresh() {
  if [[ "${REFRESH_PREDICTIONS}" != "true" && "${REFRESH_PREDICTIONS}" != "1" ]]; then
    echo "${LOG_PREFIX} skipping prediction refresh (MODEL_TRAIN_REFRESH_PREDICTIONS=${REFRESH_PREDICTIONS})"
    return 0
  fi
  if [[ -z "${PUSH_CRON_SECRET:-}" ]]; then
    echo "${LOG_PREFIX} skipping prediction refresh (PUSH_CRON_SECRET unset)" >&2
    return 0
  fi
  echo "${LOG_PREFIX} refreshing predictions with new model ..."
  "${REPO_ROOT}/scripts/cron/internal_predictions_run.sh"
}

# Prefer a one-off container with a writable host mount (api service /models is :ro).
if command -v docker >/dev/null 2>&1 && [[ -f docker-compose.yml ]]; then
  mkdir -p ml/models
  echo "${LOG_PREFIX} training via docker compose run → ml/models ..."
  docker compose run --rm --user root \
    -v "${REPO_ROOT}/ml/models:/model-out:rw" \
    api "${TRAIN_ARGS[@]}"
  echo "${LOG_PREFIX} artifacts written to ${REPO_ROOT}/ml/models"
  _run_predictions_refresh || echo "${LOG_PREFIX} prediction refresh failed (non-fatal)" >&2
  echo "${LOG_PREFIX} done"
  exit 0
fi

# Fallback: call internal endpoint (requires writable MODEL_ARTIFACT_DIR in the API process).
: "${PUSH_CRON_SECRET:?PUSH_CRON_SECRET is not set (add to .env)}"
BODY=$(python3 <<PY
import json, os
print(json.dumps({
    "min_games": int(os.environ.get("MODEL_TRAIN_MIN_GAMES") or 60),
    "force": str(os.environ.get("MODEL_TRAIN_FORCE") or "false").lower() in ("1", "true", "yes"),
    "out_dir": "/model-out",
}))
PY
)
echo "${LOG_PREFIX} training via POST /internal/ml/train ..."
curl -fsS -X POST \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d "${BODY}" \
  "${BASE%/}/internal/ml/train"
_run_predictions_refresh || echo "${LOG_PREFIX} prediction refresh failed (non-fatal)" >&2
echo "${LOG_PREFIX} done"

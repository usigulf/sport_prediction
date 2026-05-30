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
: "${PUSH_CRON_SECRET:?PUSH_CRON_SECRET is not set (add to .env)}"
BASE="${API_INTERNAL_URL:-http://127.0.0.1:8000}"
MIN_GAMES="${MODEL_TRAIN_MIN_GAMES:-60}"
FORCE="${MODEL_TRAIN_FORCE:-false}"
TRAIN_ARGS=(python scripts/train_model.py --out /models --min-games "${MIN_GAMES}")
if [[ "${FORCE}" == "true" || "${FORCE}" == "1" ]]; then
  TRAIN_ARGS+=(--force)
fi
BODY=$(python3 <<PY
import json, os
print(json.dumps({
    "min_games": int(os.environ.get("MODEL_TRAIN_MIN_GAMES") or 60),
    "force": str(os.environ.get("MODEL_TRAIN_FORCE") or "false").lower() in ("1", "true", "yes"),
    "out_dir": "/models",
}))
PY
)

# Prefer a one-off container with a writable models mount (API service mount is :ro).
if command -v docker >/dev/null 2>&1 && [[ -f docker-compose.yml ]]; then
  mkdir -p ml/models
  echo "Training via docker compose run → ml/models ..."
  docker compose run --rm \
    -v "${REPO_ROOT}/ml/models:/models" \
    api "${TRAIN_ARGS[@]}"
  echo "Artifacts written to ${REPO_ROOT}/ml/models"
  exit 0
fi

# Fallback: call internal endpoint (requires writable MODEL_ARTIFACT_DIR in the API process).
echo "Training via POST /internal/ml/train ..."
curl -fsS -X POST \
  -H "X-Cron-Secret: ${PUSH_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d "${BODY}" \
  "${BASE%/}/internal/ml/train"

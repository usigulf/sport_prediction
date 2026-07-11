#!/usr/bin/env bash
set -euo pipefail

# Blue/green API deploy (Imp #59) — builds new image tag, health-checks, swaps container.
# Requires: docker compose, project at ROOT_DIR, .env with production secrets.
#
# Usage:
#   DEPLOY_COLOR=green scripts/deploy_api_blue_green.sh
#   DEPLOY_COLOR=blue  scripts/deploy_api_blue_green.sh

ROOT_DIR="${ROOT_DIR:-$HOME/sport_prediction}"
cd "$ROOT_DIR"

COLOR="${DEPLOY_COLOR:-green}"
OTHER=$([[ "$COLOR" == "green" ]] && echo "blue" || echo "green")
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
SERVICE="api-${COLOR}"
OTHER_SERVICE="api-${OTHER}"
IMAGE_TAG="octobetiq-api:${COLOR}-$(git rev-parse --short HEAD)"

echo "[blue-green] Pull + build ${IMAGE_TAG}..."
git pull
docker build -t "$IMAGE_TAG" ./backend

echo "[blue-green] Run migrations..."
"${COMPOSE[@]}" run --rm --no-deps api alembic upgrade head

echo "[blue-green] Start ${SERVICE} on alternate port..."
export API_HOST_PORT=$([[ "$COLOR" == "green" ]] && echo "8001" || echo "8002")
docker rm -f "sport-prediction-${SERVICE}" 2>/dev/null || true
docker run -d --name "sport-prediction-${SERVICE}" \
  --network sport_prediction_sport-prediction-network \
  --env-file .env.production \
  -e ENVIRONMENT=production \
  -e OPENAPI_DOCS_ENABLED=false \
  -p "127.0.0.1:${API_HOST_PORT}:8000" \
  "$IMAGE_TAG"

echo "[blue-green] Health check ${SERVICE} on :${API_HOST_PORT}..."
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS "http://127.0.0.1:${API_HOST_PORT}/health" | head -c 200
echo

if [[ "${NGINX_AUTO_SWAP:-}" == "1" ]] && [[ -x "${ROOT_DIR}/scripts/nginx_swap_upstream.sh" ]]; then
  echo "[blue-green] Auto-swapping nginx upstream to port ${API_HOST_PORT}..."
  sudo "${ROOT_DIR}/scripts/nginx_swap_upstream.sh" "${API_HOST_PORT}" "${NGINX_CONF_PATH:-/etc/nginx/sites-available/octobetiq-api}"
else
  echo "[blue-green] Swap nginx upstream to port ${API_HOST_PORT}:"
  echo "  NGINX_AUTO_SWAP=1 ${ROOT_DIR}/scripts/nginx_swap_upstream.sh ${API_HOST_PORT}"
  echo "  Or update deploy/nginx upstream to 127.0.0.1:${API_HOST_PORT} and reload nginx."
fi
echo "[blue-green] Stop previous ${OTHER_SERVICE} when satisfied:"
echo "  docker rm -f sport-prediction-${OTHER_SERVICE} 2>/dev/null || true"

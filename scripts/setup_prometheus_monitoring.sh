#!/usr/bin/env bash
# Start Prometheus (+ optional Grafana) monitoring profile on the VPS.
#
# Usage:
#   ./scripts/setup_prometheus_monitoring.sh
#
# Prometheus UI: ssh tunnel → http://127.0.0.1:9090 (not exposed publicly by default).
# API metrics: scraped inside Docker network at api:8000/metrics.

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/sport_prediction}"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile monitoring)

echo "[monitoring] Starting Prometheus (and Grafana)..."
"${COMPOSE[@]}" up -d prometheus grafana

echo "[monitoring] Waiting for Prometheus..."
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:9090/-/ready" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if curl -fsS "http://127.0.0.1:9090/-/ready" >/dev/null 2>&1; then
  echo "[monitoring] Prometheus ready at http://127.0.0.1:9090"
else
  echo "[monitoring] WARN: Prometheus not responding on :9090 yet"
  "${COMPOSE[@]}" ps prometheus || true
  exit 1
fi

echo "[monitoring] Verify API target (inside docker network):"
"${COMPOSE[@]}" exec -T prometheus wget -qO- http://api:8000/metrics 2>/dev/null | head -5 || \
  echo "[monitoring] WARN: could not scrape api:8000/metrics — ensure API container is running"

echo "[monitoring] Done. Use SSH tunnel for UI: ssh -L 9090:127.0.0.1:9090 root@YOUR_VPS"

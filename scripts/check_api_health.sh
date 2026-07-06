#!/usr/bin/env bash
# Uptime probe for cron or external monitoring (audit improvement #20).
#
# Usage:
#   ./scripts/check_api_health.sh
#   API_URL=https://api.octobetiq.com ./scripts/check_api_health.sh
#
# Cron example (every 5 min, log failures):
#   */5 * * * * /root/sport_prediction/scripts/check_api_health.sh >>/var/log/api_health.log 2>&1

set -euo pipefail

API_URL="${API_URL:-https://api.octobetiq.com}"
TS="$(date -Is)"

if ! curl -fsS --max-time 15 "${API_URL}/health" >/dev/null; then
  echo "${TS} FAIL ${API_URL}/health" >&2
  exit 1
fi

if ! curl -fsS --max-time 15 "${API_URL}/ready" >/dev/null; then
  echo "${TS} FAIL ${API_URL}/ready" >&2
  exit 1
fi

echo "${TS} OK ${API_URL}"

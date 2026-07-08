#!/usr/bin/env bash
# Staging API uptime probe (audit PH2-009).
#
# Usage:
#   ./scripts/check_staging_health.sh
#   STAGING_URL=https://api-staging.octobetiq.com ./scripts/check_staging_health.sh

set -euo pipefail

STAGING_URL="${STAGING_URL:-https://api-staging.octobetiq.com}"
TS="$(date -Is)"

body="$(curl -fsS --max-time 15 "${STAGING_URL}/health")"
if ! echo "${body}" | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("status")=="healthy" else 1)'; then
  echo "${TS} FAIL ${STAGING_URL}/health body=${body}" >&2
  exit 1
fi

if ! curl -fsS --max-time 15 "${STAGING_URL}/ready" >/dev/null; then
  echo "${TS} FAIL ${STAGING_URL}/ready" >&2
  exit 1
fi

echo "${TS} OK ${STAGING_URL} ${body}"

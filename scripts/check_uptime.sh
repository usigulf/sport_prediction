#!/usr/bin/env bash
# Thin alias for HA docs — probes /health + /ready (audit #18).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "${ROOT}/scripts/check_api_health.sh" "$@"

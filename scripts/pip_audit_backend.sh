#!/usr/bin/env bash
# CI pip-audit: fail on known vulnerabilities in pinned requirements.txt.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}/backend"

pip-audit -r requirements.txt

#!/usr/bin/env bash
# Lightweight Bandit SAST for backend/app (audit #17). Fails on high-severity findings.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}/backend"

PYTHON="${PYTHON:-python3}"
if ! command -v "${PYTHON}" >/dev/null 2>&1; then
  PYTHON=python
fi

if ! "${PYTHON}" -c "import bandit" 2>/dev/null; then
  "${PYTHON}" -m pip install -q 'bandit>=1.7,<2'
fi

# High-severity gate only; medium findings (pickle ML, urlopen) documented in threat model
"${PYTHON}" -m bandit -r app --severity-level high --confidence-level medium -q -f txt

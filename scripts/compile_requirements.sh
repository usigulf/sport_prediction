#!/usr/bin/env bash
# Regenerate pinned backend/requirements.txt and requirements-dev.txt from *.in files.
# Requires uv: https://docs.astral.sh/uv/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="${ROOT}/backend"

if ! command -v uv >/dev/null 2>&1; then
  echo "ERROR: uv is required. Install: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
fi

cd "$BACKEND"

echo "[compile] requirements.txt (Python 3.11)"
uv pip compile --python 3.11 --strip-extras -o requirements.txt requirements.in

echo "[compile] requirements-dev.txt (Python 3.11)"
uv pip compile --python 3.11 --strip-extras -o requirements-dev.txt requirements-dev.in

echo "[compile] Done."

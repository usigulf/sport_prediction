#!/usr/bin/env bash
# Quarterly reminder to review ASC App Privacy nutrition label (I85).
# Prints checklist link — does not call ASC APIs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "[asc-privacy] Quarterly App Privacy review due for octobetiQ."
echo "[asc-privacy] Follow: ${ROOT}/docs/ASC_OPS_CHECKLIST.md §2"
echo "[asc-privacy] Play Console data safety: ${ROOT}/docs/GOOGLE_PLAY_LAUNCH.md"
echo "[asc-privacy] Date: $(date -Is)"

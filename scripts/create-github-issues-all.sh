#!/usr/bin/env bash
# Create all GitHub issues from PRODUCT_EXECUTION_PLAN (Epics E1–E5).
# Run E1 first: ./scripts/create-github-issues-e1.sh
# Then: ./scripts/create-github-issues-all.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/create-github-issues-e1.sh"
"$SCRIPT_DIR/create-github-issues-e2-e5.sh"

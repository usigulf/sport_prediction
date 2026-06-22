#!/usr/bin/env bash
# Create all GitHub issues (Epics E1–E5) via REST API.
# Usage: export GITHUB_TOKEN=ghp_xxx && ./scripts/create-github-issues-api-all.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/create-github-issues-api-e1.sh"
"$SCRIPT_DIR/create-github-issues-api-e2-e5.sh"

#!/usr/bin/env bash
# Print canonical App Store Connect keywords for paste (P1-008).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="${ROOT}/mobile/app-store-metadata/keywords.txt"

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: missing $FILE" >&2
  exit 1
fi

KW="$(tr -d '\n' <"$FILE")"
if [[ "$KW" == ports,* ]]; then
  echo "ERROR: keywords.txt still starts with ports, — fix before pasting into ASC" >&2
  exit 1
fi

echo "Paste into App Store Connect → App Information → Keywords:"
echo ""
echo "$KW"
echo ""
echo "(${#KW} characters — ASC limit 100)"

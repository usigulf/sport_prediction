#!/usr/bin/env bash
# Caption + reorder iPhone screenshots, then letterbox for iPad 13" ASC upload.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$MOBILE_DIR"

python3 scripts/add-screenshot-captions.py
"$SCRIPT_DIR/resize-screenshots-ipad-13.sh" \
  "$MOBILE_DIR/app-store-screenshots/6.5-inch/asc-upload" \
  "$MOBILE_DIR/app-store-screenshots/ipad-13-inch/asc-upload"

echo ""
echo "iPhone 6.5\" → app-store-screenshots/6.5-inch/asc-upload/"
echo "iPad 13\"     → app-store-screenshots/ipad-13-inch/asc-upload/"

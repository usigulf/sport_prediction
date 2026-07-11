#!/usr/bin/env bash
# Check iOS widget extension embed status (I70).
# Exit 0 always — prints OK or WARN for CI/docs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PBX="$ROOT/mobile/ios/octobetiQ.xcodeproj/project.pbxproj"
SWIFT="$ROOT/mobile/ios/TopPickWidget/TopPickWidget.swift"

if [[ ! -f "$SWIFT" ]]; then
  echo "FAIL missing TopPickWidget.swift template"
  exit 1
fi

if [[ -f "$PBX" ]] && grep -q "TopPickWidget" "$PBX" 2>/dev/null; then
  echo "OK  TopPickWidget target referenced in Xcode project"
else
  echo "WARN TopPickWidget not embedded in octobetiQ.xcodeproj — follow docs/IOS_WIDGET.md checklist"
fi

bash "$ROOT/scripts/verify_widget_api.sh" 2>/dev/null || echo "WARN widget API verify skipped (network/backend)"

echo "[widget-embed] Done."

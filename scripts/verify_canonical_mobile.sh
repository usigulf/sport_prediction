#!/usr/bin/env bash
# Ensure the canonical mobile app is mobile/ and apps/mobile is not resurrected.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() { echo "FAIL $*"; exit 1; }
ok() { echo "OK  $*"; }

[[ -f mobile/package.json ]] || fail "missing mobile/package.json (canonical app)"
[[ -d mobile/src ]] || fail "missing mobile/src"
ok "canonical mobile/ present"

if [[ -d apps/mobile ]]; then
  fail "apps/mobile must not exist — use mobile/ (archived copy: archive/apps-mobile/)"
fi
ok "apps/mobile absent"

[[ -f archive/apps-mobile/package.json ]] || fail "missing archive/apps-mobile/package.json"
[[ -f apps/README.md ]] || fail "missing apps/README.md pointer"
ok "archive/apps-mobile + apps/README.md pointers present"

echo "Canonical mobile workspace check OK."

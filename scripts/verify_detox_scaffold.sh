#!/usr/bin/env bash
# Verify Detox E2E scaffold is present (I76). Does not run simulator tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

for f in .detoxrc.js e2e/jest.config.js e2e/paywall.e2e.ts e2e/README.md; do
  if [[ ! -f "$MOBILE/$f" ]]; then
    echo "FAIL missing mobile/$f"
    exit 1
  fi
done

python3 <<'PY'
from pathlib import Path
pkg = Path("mobile/package.json").read_text(encoding="utf-8")
for needle in ('"test:e2e"', '"detox"', '"jest-circus"'):
    if needle not in pkg:
        raise SystemExit(f"missing {needle} in mobile/package.json")
paywall = Path("mobile/src/screens/PaywallScreen.tsx").read_text(encoding="utf-8")
for tid in ("paywall-screen", "paywall-choose-plan", "paywall-price-promo", "paywall-premium-card"):
    if tid not in paywall:
        raise SystemExit(f"missing {tid} in PaywallScreen")
print("OK  detox scaffold")
PY

echo "[detox-verify] Done."

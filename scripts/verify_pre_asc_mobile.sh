#!/usr/bin/env bash
# Pre-ASC mobile checks (TypeScript + paywall gating patterns).
#
# Usage:
#   ./scripts/verify_pre_asc_mobile.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "[mobile-verify] TypeScript..."
npx tsc --noEmit

echo "[mobile-verify] Paywall annual gating..."
python3 <<'PY'
from pathlib import Path
text = Path("src/screens/PaywallScreen.tsx").read_text(encoding="utf-8")
for needle in ("annualBillingAvailable", "annualBillingAvailable ?"):
    if needle not in text:
        raise SystemExit(f"missing {needle!r} in PaywallScreen.tsx")
if "packages.find((p) => p.tier === tierId && p.billingPeriod === billingPeriod)" not in text:
    raise SystemExit("IAP must not fall back to wrong billing period")
print("OK  paywall annual gating")
PY

echo "[mobile-verify] Production push entitlements..."
python3 <<'PY'
from pathlib import Path
ent = Path("ios/octobetiQ/octobetiQ.entitlements").read_text(encoding="utf-8")
if "<string>production</string>" not in ent:
    raise SystemExit("aps-environment must be production for App Store builds")
print("OK  aps-environment production")
PY

echo "[mobile-verify] Detox scaffold..."
bash "$ROOT/scripts/verify_detox_scaffold.sh"

echo "[mobile-verify] Done."

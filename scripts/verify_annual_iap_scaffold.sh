#!/usr/bin/env bash
# Verify annual IAP code scaffold (W33 / I41). No ASC login required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

for f in \
  docs/ANNUAL_IAP_SETUP.md \
  mobile/src/constants/subscriptionPricing.ts \
  mobile/src/screens/PaywallScreen.tsx \
  mobile/src/services/purchases.ts \
  backend/tests/test_annual_subscription_plan.py
do
  [[ -f "$ROOT/$f" ]] || { echo "FAIL missing $f"; exit 1; }
done

python3 <<'PY'
from pathlib import Path
root = Path(".").resolve()
pricing = (root / "mobile/src/constants/subscriptionPricing.ts").read_text(encoding="utf-8")
paywall = (root / "mobile/src/screens/PaywallScreen.tsx").read_text(encoding="utf-8")
for needle in ("com.octobetiq.premium.annual", "PREMIUM_ANNUAL_PRICE_LABEL"):
    if needle not in pricing:
        raise SystemExit(f"missing {needle} in subscriptionPricing.ts")
for needle in ("annualBillingAvailable", "billingPeriod", "paywall-premium-card"):
    if needle not in paywall:
        raise SystemExit(f"missing {needle} in PaywallScreen.tsx")
env_prod = (root / ".env.production.example").read_text(encoding="utf-8")
if "STRIPE_PRICE_ID_PREMIUM_ANNUAL" not in env_prod:
    raise SystemExit("STRIPE_PRICE_ID_PREMIUM_ANNUAL missing from .env.production.example")
print("OK  annual IAP scaffold")
PY

echo "[annual-iap-scaffold] Done."

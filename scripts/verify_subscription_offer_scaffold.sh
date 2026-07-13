#!/usr/bin/env bash
# Verify subscription offer scaffold (external audit #19). Does not require ASC login.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for f in \
  docs/SUBSCRIPTION_OFFER_POLICY.md \
  docs/SUBSCRIPTION_TIERS.md \
  docs/MODEL_ACCEPTANCE_PROTOCOL.md \
  docs/ANNUAL_IAP_SETUP.md \
  mobile/src/constants/subscriptionPricing.ts \
  mobile/src/constants/subscriptionPricing.test.ts \
  mobile/src/constants/analyticsEvents.ts \
  mobile/src/constants/planFeatures.ts \
  mobile/src/components/paywall/PaywallHero.tsx \
  mobile/src/screens/PaywallScreen.tsx
do
  if [[ ! -f "$f" ]]; then
    echo "FAIL missing $f"
    exit 1
  fi
done

python3 <<'PY'
from pathlib import Path

needles = {
    "docs/SUBSCRIPTION_OFFER_POLICY.md": (
        "not evidence",
        "invite_founder",
        "public_list",
        "public_charge",
        "$9.99",
        "$29.99",
        "Durable benefits",
    ),
    "mobile/src/constants/subscriptionPricing.ts": (
        "ACTIVE_OFFER_PHASE",
        "invite_founder",
        "FOUNDER_MONTHLY_PRICE_LABEL",
        "PUBLIC_LIST_MONTHLY_PRICE_LABEL",
        "offerPhaseHeadline",
    ),
    "mobile/src/constants/analyticsEvents.ts": (
        "paywall_viewed",
        "paywall_cta_tapped",
        "trial_started",
        "trial_converted",
        "subscription_cancelled",
    ),
    "mobile/src/constants/planFeatures.ts": (
        "Unlimited soccer predictions",
        "publish-ready",
    ),
    "mobile/src/components/paywall/PaywallHero.tsx": (
        "offerPhaseHeadline",
        "invite_founder",
    ),
    "mobile/src/screens/PaywallScreen.tsx": (
        "PAYWALL_VIEWED",
        "PAYWALL_CTA_TAPPED",
        "ACTIVE_OFFER_PHASE",
    ),
    "docs/SUBSCRIPTION_TIERS.md": ("SUBSCRIPTION_OFFER_POLICY",),
}
for path, tids in needles.items():
    text = Path(path).read_text(encoding="utf-8")
    for tid in tids:
        if tid not in text:
            raise SystemExit(f"missing {tid!r} in {path}")
print("OK  subscription offer scaffold (founder phase, gates, analytics stubs)")
PY

echo "[subscription-offer-verify] Done."

#!/usr/bin/env bash
# Verify Detox E2E scaffold is present (I76 / audit #10). Does not run simulator tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

for f in \
  .detoxrc.js \
  e2e/jest.config.js \
  e2e/helpers.ts \
  e2e/gates.e2e.ts \
  e2e/guest.e2e.ts \
  e2e/auth.e2e.ts \
  e2e/gameDetail.e2e.ts \
  e2e/paywall.e2e.ts \
  e2e/profileDelete.e2e.ts \
  e2e/README.md \
  docs/DETOX_E2E.md
do
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

checks = {
    "mobile/src/screens/PaywallScreen.tsx": (
        "paywall-screen",
        "paywall-choose-plan",
        "paywall-price-promo",
        "paywall-premium-card",
        "paywall-restore",
    ),
    "mobile/src/screens/AgeGateScreen.tsx": ("age-gate-screen", "age-gate-continue"),
    "mobile/src/screens/PrivacyConsentScreen.tsx": (
        "privacy-consent-screen",
        "privacy-consent-continue",
        "privacy-analytics-switch",
        "privacy-ads-switch",
    ),
    "mobile/src/screens/LandingScreen.tsx": (
        "landing-screen",
        "landing-login",
        "landing-get-free-picks",
    ),
    "mobile/src/screens/HomeScreen.tsx": ("home-screen",),
    "mobile/src/screens/GuestProfileScreen.tsx": (
        "guest-profile-screen",
        "guest-create-account",
        "guest-view-premium",
        "guest-sign-in",
    ),
    "mobile/src/screens/LoginScreen.tsx": ("login-screen", "login-submit"),
    "mobile/src/screens/RegisterScreen.tsx": ("register-screen", "register-submit"),
    "mobile/src/screens/GameDetailScreen.tsx": ("game-detail-screen",),
    "mobile/src/screens/ProfileScreen.tsx": ("profile-screen", "profile-delete-account"),
    "mobile/e2e/helpers.ts": ("launchFreshApp", "completeFirstRunGates", "openDeepLink"),
}

for path, tids in checks.items():
    text = Path(path).read_text(encoding="utf-8")
    for tid in tids:
        if tid not in text:
            raise SystemExit(f"missing {tid} in {path}")

print("OK  detox scaffold (gates, guest, auth, game, paywall, delete)")
PY

echo "[detox-verify] Done."

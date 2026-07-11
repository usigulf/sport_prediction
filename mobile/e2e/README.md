# Detox E2E (I76)

Paywall flow tests live in `e2e/paywall.e2e.ts`. Detox requires a **development build** (not Expo Go).

## Prerequisites

1. Install Detox CLI and build tools (one-time):

```bash
cd mobile
npm install --save-dev detox jest-circus
```

2. Build the iOS app for simulator:

```bash
npx expo run:ios --configuration Release
```

3. Configure `.detoxrc.js` (included in repo) — update `binaryPath` if your scheme/output differs.

## Run paywall tests

```bash
cd mobile
npx detox test e2e/paywall.e2e.ts --configuration ios.sim.release
```

For guest paywall preview, launch with deep link or screenshot route:

```bash
# Example: open Paywall directly (screenshot navigation flag)
EXPO_PUBLIC_CAPTURE_SCREENSHOTS=1 npx expo run:ios
```

## testIDs

| testID | Screen |
|--------|--------|
| `paywall-screen` | Paywall root |
| `paywall-choose-plan` | Plan picker title |
| `paywall-premium-card` | Premium tier card |
| `paywall-price-promo` | Price experiment banner |

Add new flows by extending `e2e/` and matching `testID` props in screens.

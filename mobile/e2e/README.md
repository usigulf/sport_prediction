# Detox E2E (I76 / external audit #10)

Critical-path specs live under `mobile/e2e/`. Detox requires a **development build** (not Expo Go).

## Specs

| Spec | Covers |
|------|--------|
| `gates.e2e.ts` | Fresh install age gate → privacy consent → home |
| `guest.e2e.ts` | Guest home → Account → register / landing |
| `auth.e2e.ts` | Login / register deep links |
| `gameDetail.e2e.ts` | `game/:gameId` deep link |
| `paywall.e2e.ts` | Guest Premium entry + deep link + restore affordance |
| `profileDelete.e2e.ts` | Guest has no delete; optional auth delete with env creds |

Shared helpers: `e2e/helpers.ts` (`launchFreshApp`, `completeFirstRunGates`, `openDeepLink`).

## Prerequisites

```bash
cd mobile
npm install
npx expo run:ios --configuration Release
```

Configure `.detoxrc.js` `binaryPath` if your scheme/output differs.

## Run

```bash
cd mobile
# Scaffold only (no simulator):
npm run verify:e2e

# Full suite:
npx detox test --configuration ios.sim.release

# Single flow:
npx detox test e2e/gates.e2e.ts --configuration ios.sim.release
```

## Optional authenticated delete

```bash
DETOX_E2E_EMAIL=you@example.com DETOX_E2E_PASSWORD='…' \
  npx detox test e2e/profileDelete.e2e.ts --configuration ios.sim.release
```

## Deep links

Scheme: `com.sportsprediction.app://`

Examples: `paywall`, `login`, `register`, `landing`, `game/:gameId`, `profile`, `home`.

## testIDs (selected)

| testID | Screen |
|--------|--------|
| `age-gate-screen` / `age-gate-continue` | Age gate |
| `privacy-consent-screen` / `privacy-consent-continue` | Privacy |
| `home-screen` | Home |
| `guest-profile-screen` / `guest-view-premium` | Guest Account |
| `landing-screen` | Landing |
| `login-screen` / `register-screen` | Auth |
| `game-detail-screen` | Game detail |
| `paywall-screen` / `paywall-premium-card` / `paywall-restore` | Paywall |
| `profile-delete-account` | Authenticated profile |

See also `docs/DETOX_E2E.md`.

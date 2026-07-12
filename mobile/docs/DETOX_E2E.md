# Detox E2E (Imp #76 / audit #10)

Detox requires a macOS runner with Xcode and a built `.app` binary. This repo ships config + critical-path specs so CI wiring is the remaining gap.

## Specs

- **gates** — age → privacy → home on fresh install; gates not re-shown
- **guest** — home value path, Account tab, register entry, landing deep link
- **auth** — login / register deep links (no credentials required)
- **gameDetail** — `com.sportsprediction.app://game/:id`
- **paywall** — guest Premium row + deep link; restore when purchases SDK is present
- **profileDelete** — guest has no delete CTA; optional login + delete control via `DETOX_E2E_EMAIL` / `DETOX_E2E_PASSWORD`

Helpers: `mobile/e2e/helpers.ts`.

## Local (after iOS Release build)

```bash
cd mobile
npm run verify:e2e
npx detox test --configuration ios.sim.release
```

## CI

Add a `mobile-e2e` job on `macos-latest` with an EAS / `expo run:ios` artifact. Blocked on Apple credentials + macOS runner budget unless using EAS Workflows. Scaffold verification runs in `scripts/verify_audit_scaffolds.sh` without a simulator.

# Detox E2E (Imp #76) — skeleton

Detox requires a macOS CI runner with Xcode and a built `.app` binary. This repo ships the config so only CI wiring remains.

## Local (after `npm run ios` build)

```bash
cd mobile
npm install --save-dev detox @config-plugins/detox
npx detox test --configuration ios.sim.debug
```

## Paywall flow spec

See `mobile/e2e/paywall.e2e.ts` — asserts guest can open paywall preview and sees Premium copy without completing IAP (StoreKit mocked in CI).

## CI

Add a `mobile-e2e` job on `macos-latest` with EAS build artifact or local `expo run:ios`. Blocked on Apple credentials + macOS runner budget unless using EAS Workflows.

# App Store submit — version 1.0.1 (build 38+)

Run **after** `./scripts/verify_pre_asc_prod.sh` and `./scripts/verify_pre_asc_mobile.sh`.

## 1. App Store Connect — create version (required before EAS submit)

EAS submit fails if marketing version **1.0.1** does not exist in ASC.

1. [App Store Connect → octobetiQ → Distribution](https://appstoreconnect.apple.com/apps/6762173223/distribution/ios/version/inflight)
2. **+ Version** → **1.0.1**
3. Fill metadata from [APP_STORE_METADATA_COPY.md](./APP_STORE_METADATA_COPY.md)
4. Attach **Premium Monthly** IAP (annual optional until `com.octobetiq.premium.annual` is Ready to Submit)

## 2. Upload binary

```bash
cd mobile
npx eas-cli build --platform ios --profile production --non-interactive
# After build completes:
npx eas-cli submit --platform ios --profile production --latest --non-interactive --wait
```

Latest production build: **1.0.1 (38)** — [build log](https://expo.dev/accounts/usigulf/projects/sport-prediction/builds/3e0ab581-5a64-4da7-95e1-60f3e371316f)

## 3. Attach build in ASC

1. Version **1.0.1** → **Build** → **+** → select **1.0.1 (38)**
2. Screenshots (if UI changed): `mobile/app-store-screenshots/*/asc-upload/`
3. Demo account in App Review Information
4. **Add for Review** → **Submit to App Review**

## Pre-submit code (included in build 38+)

- Annual paywall hidden until ASC annual product is linked in RevenueCat
- Production push entitlements (`aps-environment: production`)
- Deep link scheme `octobetiq://`
- No Test Store RevenueCat fallback in production builds
- Guest paywall preview, HomeScreen modules, NetInfo offline banner

## Still manual in ASC / RevenueCat

| Item | Action |
|------|--------|
| Premium Annual | Create `com.octobetiq.premium.annual` in ASC + RevenueCat when ready ($299.99/yr) |
| Free app price | Pricing → **Free** ($0) |
| App Privacy | Publish questionnaire (align with ATT) |

# Google Play launch (I50)

Android build pipeline exists (`eas.json` production profile, `expo run:android`). Play Console submission requires a Google Play Developer account and service account JSON (gitignored).

## Prerequisites

| Item | Location |
|------|----------|
| Package name | `com.sportsprediction.app` (`mobile/app.json`) |
| EAS Android build | `npm run eas:build:android` |
| Submit config | `mobile/eas.json` → `submit.production.android` |
| Service account | `mobile/secrets/google-play-service-account.json` (not in git) |

Scaffold verify: `bash scripts/verify_external_ops_readiness.sh`

---

## 1. Play Console setup

1. [Google Play Console](https://play.google.com/console) → create app **octobetiQ**  
2. **App content** — complete questionnaire (gambling/sweepstakes → **No**; informational picks)  
3. **Data safety** — align with iOS App Privacy answers (see [ASC_OPS_CHECKLIST.md](./ASC_OPS_CHECKLIST.md))  
4. **Store listing** — reuse copy from `mobile/docs/APP_STORE_METADATA_COPY.md` (adapt for Play character limits)  
5. **Content rating** — IARC questionnaire (similar positioning to iOS 17+)  

---

## 2. Service account for EAS Submit

1. Play Console → **Setup → API access** → link Google Cloud project  
2. Create service account with **Release to production** (or internal testing first)  
3. Download JSON → `mobile/secrets/google-play-service-account.json`  
4. Grant app access in Play Console for that service account  

---

## 3. Build and upload

```bash
cd mobile
npm run eas:build:android
# After build completes:
npm run eas:submit:android
```

Or internal track first:

```bash
eas submit --platform android --profile production --latest --track internal
```

---

## 4. RevenueCat / Play Billing

1. RevenueCat → add **Google Play** app with same package name  
2. Link subscription products (`premium` monthly; annual when ready — [ANNUAL_IAP_SETUP.md](./ANNUAL_IAP_SETUP.md))  
3. Test purchase on internal track before production rollout  

---

## 5. Pre-launch checklist

- [ ] Privacy policy URL live (`https://octobetiq.com/privacy`)  
- [ ] Same prediction disclaimers as iOS (`PredictionDisclaimer` components)  
- [ ] `EXPO_PUBLIC_API_URL` points to production API in EAS production profile  
- [ ] AdMob Android app ID in `app.json` / EAS env if ads enabled  
- [ ] Internal track smoke test: sign-in, paywall, one game detail  

---

## Post-launch

- Monitor Play Console **Android vitals** and RevenueCat Google Play webhooks  
- Keep iOS and Android subscription entitlements in sync (`premium` in backend)

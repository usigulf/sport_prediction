# Ad monetization (octobetiQ mobile)

Tech stack here: **Expo SDK 54 + React Native 0.81**, **React Navigation**, **Google Mobile Ads via `react-native-google-mobile-ads`**, modular **Ad Engine** in `mobile/src/ads/`.

## What was added

| Area | Location |
|------|-----------|
| Rules (frequency, cohorts, caps) | `src/ads/config/defaultAdRules.ts` — extend with AsyncStorage `@octobetiQ/ad_rules_override_v1` JSON merge |
| Session metrics | `src/ads/analytics/sessionMetrics.ts` — impressions, clicks, rewarded completes, rough revenue micros |
| Mediation placeholders | `src/ads/mediation/coordinator.ts` — wire AppLovin MAX / Unity in native projects |
| Contexts | `AdEngineProvider`, `RewardedUnlockProvider` in `src/ads/engine/` |
| Placements | Home (`HomeScreen`), Live Hub list + banner dock, Game detail (native strip, gated analysis, footer banner, occasional exit interstitial) |

### Expo Go + iOS (and Android)

**Real ads will not load.** Expo Go’s binary does not ship **`RNGoogleMobileAdsModule`**. The app checks for that native module and skips loading the JS SDK in Go, so you only get **house promo / placeholder** UI where ads would be—not test or live creatives.

To see banners and native ads on **iOS**, use a build that includes your native project, for example:

- **`npx expo run:ios`** (after `expo prebuild` if needed), or  
- **EAS Build** (development or production profile).

You can still use **Expo Go** for layout, navigation, and API work; use a **dev build** when testing monetization.

## Google AdMob configuration

1. Create apps + ad units in [AdMob](https://admob.google.com/).
2. Replace **test IDs** under `mobile/app.json` → `extra` (`adMobBannerIos`, `adMobRewardedIos`, …) with **your unit IDs**.
3. The config plugin maps **App IDs**:

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-XXXXXXXX~YYYYYYYYYY",
    "iosAppId": "ca-app-pub-XXXXXXXX~YYYYYYYYYY"
  }
]
```

4. iOS ATT / GDPR: integrate **UMP** (`AdsConsent` from `react-native-google-mobile-ads`) before loading ads — required for regulatory compliance before production scale.

## Mediation & “no empty slot” strategy

Native **AdMob** loads first; on failure **`HousePromotionCard`** renders octobetiQ monetization UX. Extend `NativeFeedAdCard` loader to cascade `applovin` / `unity` once SDKs ship.

Recommended order for sports verticals:

1. Audience match + contextual line items (sport, league)
2. App open + anchored banner on habitual screens (`Home`, hub)
3. Rewarded voluntary — never prerequisite for browsing core feed
4. Interstitials on natural breaks (navigation after detail) gated by cohort + cooldown + first-session quiet hour

## eCPM & ARPU playbook (concise)

- **Match ad inventory to UX**: anchored banners near thumbs; native in-feed every N cards (deterministic spacing per cohort).
- **Refresh policy**: obey network min refresh intervals; rotate placements by screen.
- **Sessionizing offers**: Rewarded prompts after engagement (prediction expand), not blocking pick visibility.
- **Segment rules**: Tune `DEFAULT_AD_RULES` or push overrides remotely for “new/active/high_value”.
- **ARPU uplift**: Rewarded voluntary + subscription path in same tray; gated advanced stats incentivize upgrades without harming DAU.
- **Quality**: Exclude broken fill with fast house promo so layout never collapses.

## Telemetry you can expose

`AdEngine` persists per session:

- `ad_impression_count`, `ad_clicks`, `rewarded_ads_watched`, rough `revenue_per_session_micros`, `screen_where_ad_shown` map.

Implement `enqueueServerFlush` in `sessionMetrics.ts` to POST batches to `/api/v1/analytics/ad-events` or Firebase Analytics `logEvent` from the RN layer.

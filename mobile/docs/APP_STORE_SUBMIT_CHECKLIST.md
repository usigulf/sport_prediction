# App Store submit checklist (octobetiQ)

## Rejection fix (June 9, 2026 — build 20)

Apple rejected **3.1.2(c)** (subscription legal info) and **2.1(b)** (IAPs not submitted with version).

### Code fix (build 25+)

- Paywall shows subscription **title, length, price** + **Privacy** / **Terms** links (`SubscriptionLegalFooter`)
- Public EULA: `https://octobetiq.com/terms` (`web/terms.html` + `scripts/deploy_web_legal.sh`)

### App Store Connect (required)

1. **Description** — add at the end:
   ```
   Terms of Use (EULA): https://octobetiq.com/terms
   Privacy Policy: https://octobetiq.com/privacy
   ```
2. **App Privacy** → Privacy Policy URL: `https://octobetiq.com/privacy`
3. **Subscriptions** → both **Ready to Submit** (price, localization, **review screenshot** on each)
4. **Version 1.0.0** → build **25** (not 20) → **In-App Purchases and Subscriptions** → add Premium + Pro
5. **Resubmit to App Review**

### Reply to Apple (optional)

Confirm paywall shows subscription details and links; IAPs attached to version; Terms URL in description.

---

## Build 24 — submit for review

**Binary:** iOS **1.0.0 (24)** — already uploaded via EAS Submit (6/8/2026).  
**App Store Connect:** [TestFlight / builds](https://appstoreconnect.apple.com/apps/6762173223/testflight/ios) → select build **24** on the version page.

### Do this in order (~30–45 min)

| # | Where | Action |
|---|--------|--------|
| 1 | [App → Distribution → iOS App → 1.0.0](https://appstoreconnect.apple.com/apps/6762173223/distribution/ios/version/inflight) | **Build** → **+** → select **1.0.0 (24)** |
| 2 | Same page → **What's New** | Paste [release notes](#whats-new-100-build-24) below |
| 3 | Same page → **Copyright** | `© 2026 octobetiQ. All rights reserved.` |
| 4 | Same page → **Screenshots** | Upload `mobile/app-store-screenshots/6.5-inch/*.png` (10) and `ipad-13-inch/*.png` (10) |
| 5 | **App Information** | Support URL `https://octobetiq.com/support` · Privacy `https://octobetiq.com/privacy` · [Content Rights](#2-content-rights-information) |
| 6 | [App Privacy](https://appstoreconnect.apple.com/apps/6762173223/distribution/privacy) | Complete per `APP_PRIVACY_FORM_ANSWERS.md` → **Publish** |
| 7 | **Pricing and Availability** | Free app · territories as desired |
| 8 | **App Review Information** | Demo account below · notes optional |
| 9 | Version page | **Add for Review** → **Submit to App Review** |

### Listing copy (paste into App Store Connect)

**Subtitle** (30 chars max):

```
AI picks: soccer, NFL & NBA
```

**Promotional text** (optional, 170 chars):

```
Informational AI win-probability picks across 8 leagues. Tracked accuracy, favorites, challenges, and optional Premium for unlimited picks and in-play updates.
```

**Description:**

```
octobetiQ delivers informational AI sports picks — not betting advice.

LEAGUES
• Soccer: Premier League, Champions League, La Liga, Serie A, Bundesliga, MLS
• US sports: NFL and NBA

FEATURES
• Daily model picks ranked by confidence
• Personalized “For You” feed from your favorite teams and leagues
• Game detail with win probability, explanations, and player prop projections (Premium)
• In-play score and probability updates while matches are on (Premium)
• Push alerts for high-confidence plays and game reminders
• Challenges and leaderboards (Pro)
• Free tier with limited daily picks; Premium and Pro subscriptions

TRANSPARENCY
We publish tracked model accuracy in the app. Picks are for entertainment and research — not financial or gambling advice.

SUBSCRIPTIONS
Premium and Pro are optional auto-renewing subscriptions (7-day free trial on Premium where offered). Manage or cancel in iOS Settings → Apple ID → Subscriptions.

Support: https://octobetiq.com/support
Privacy: https://octobetiq.com/privacy
Terms of Use (EULA): https://octobetiq.com/terms
```

**Keywords** (100 chars, comma-separated, no spaces after commas):

```
soccer,NFL,NBA,predictions,sports,premier league,AI picks,football,basketball,odds
```

### What's New (1.0.0, build 24)

```
Initial App Store release.

• AI predictions across 8 leagues (soccer, NFL, NBA)
• Personalized For You feed, Trending picks, and game detail analysis
• In-play win-probability updates for live games (Premium)
• Push notifications, favorites, challenges, and leaderboards
• Premium & Pro subscriptions with 7-day free trial
```

### App Review demo account

| Field | Value |
|-------|--------|
| Username | `appstore-review@octobetiq.com` |
| Password | `AppReview2026!` |

**Notes to reviewer** (optional):

```
Premium features (unlimited picks, explanations, in-play updates, player props) require 
subscription — use demo account or sandbox Apple ID. Free tier shows limited daily picks 
and ads. ATT prompt appears for optional ad tracking on iOS. Account deletion: Profile → 
Delete account. Not a gambling or real-money betting app.
```

### Before you click Submit

- [ ] Build **24** selected on version **1.0.0**
- [ ] iPhone 6.5" + iPad 13" screenshots uploaded
- [ ] App Privacy **Published** (not draft)
- [ ] In-app purchases / subscriptions show **Ready to Submit** in ASC (RevenueCat products linked)
- [ ] `https://octobetiq.com/support` and `/privacy` return **200** (verified)

Reply **`submitted`** when Apple shows **Waiting for Review**.

---

Use the sections below when App Store Connect shows **Unable to Add for Review**.

## 1. Copyright (required on version page)

```
© 2026 octobetiQ. All rights reserved.
```

Use your legal entity name if different (must match Apple Developer account).

---

## 2. Content Rights Information

**App Store Connect → App Information → Content Rights**

| Question | Typical answer for octobetiQ |
|----------|----------------------------|
| Does your app contain, show, or access third-party content? | **Yes** — sports schedules, team names/logos, and prediction data from licensed API providers (e.g. Sportradar / ClearSports). |
| Do you have the necessary rights? | **Yes** — you must actually have API/data licenses in production. |

If you only show your own text/UI with no third-party logos or feeds, you can answer **No**.

---

## 3. App Privacy (Admin only)

**App Store Connect → App Privacy → Get Started** (Account Holder / Admin).

Minimum for a logged-in app with ads + ATT:

1. **Data types** you collect (examples):
   - Email address (account)
   - User ID (account)
   - Product interaction (analytics / ads if used)
   - Advertising data (if AdMob)
2. **Tracking**: set **Yes, we use data for tracking** because the binary includes `NSUserTrackingUsageDescription` and AdMob may use IDFA after ATT consent.
   - Purposes: Third-Party Advertising, Analytics
   - Link data to user: Yes (for signed-in users) / as applicable
3. Publish the privacy questionnaire.

If you do **not** want to declare tracking, you must **remove ATT** from the app and upload a **new build** (see `mobile/src/ads/native/loadGma.ts` and `NSUserTrackingUsageDescription` in Info.plist).

---

## 4. Tracking vs App Privacy (must match binary)

Your build includes:

```xml
NSUserTrackingUsageDescription
```

**Fastest fix (no new build):** In App Privacy, answer that you **track** users (for advertising/analytics as applicable).

**Alternative (new build):** Remove `expo-tracking-transparency` prompt and `NSUserTrackingUsageDescription`, then answer **No** for tracking in App Privacy.

---

## 5. iPad 13-inch screenshots

The app has `supportsTablet: true`, so Apple requires **iPad 13-inch** screenshots (2064×2752).

**Option A — Generate from iPhone shots (quick):**

```bash
cd mobile
./scripts/resize-screenshots-ipad-13.sh
```

Upload PNGs from `mobile/app-store-screenshots/ipad-13-inch/` to **iPad → 13-inch Display**.

**Option B — iPhone-only app (new build):**

Set `"supportsTablet": false` in `app.json`, run `expo prebuild` + new EAS build, then iPad screenshots are not required.

---

## 6. Sign-in for review

See prior message: `appstore-review@octobetiq.com` / `AppReview2026!`

---

## 7. Support URL (live site)

**App Store Connect → App Information → Support URL:** `https://octobetiq.com/support`

**Privacy Policy URL (App Privacy / version, max 255 chars):** `https://octobetiq.com/privacy`

Page source: `web/support.html`. On the server:

```bash
sudo cp web/support.html /var/www/octobetiq/
# Add deploy/nginx-octobetiq-support-snippet.conf to each HTTPS vhost (apex + www if split)
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://octobetiq.com/support   # expect HTTP/2 200
```

---

## Order to fix blockers

1. Copyright field on version page  
2. Content Rights in App Information  
3. App Privacy (Admin) + tracking aligned with ATT  
4. Upload iPad 13-inch screenshots  
5. Submit for review

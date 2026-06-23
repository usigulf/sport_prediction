# App Store submit checklist (octobetiQ)

**App ID:** [6762173223](https://appstoreconnect.apple.com/apps/6762173223) · **Bundle:** `com.sportsprediction.app`

---

## Submit today — build **28** on version **1.0.0**

Use the **Complete** TestFlight build already uploaded. Do **not** wait for a new EAS build (quota resets ~July 1, 2026).

| Step | Where in ASC | Action |
|------|----------------|--------|
| 1 | [Pricing and Availability](https://appstoreconnect.apple.com/apps/6762173223/distribution/pricing) | Set app price to **Free** ($0). Button must show **GET**, not $29.99. |
| 2 | [Version 1.0.0](https://appstoreconnect.apple.com/apps/6762173223/distribution/ios/version/inflight) | **Build** → **+** → select **1.0.0 (28)** only. |
| 3 | Same page → **Screenshots** | Upload from **`mobile/app-store-screenshots/6.5-inch/asc-upload/`** (10 PNGs) and **`ipad-13-inch/asc-upload/`** (10 PNGs). Order in `manifest.json`. |
| 4 | Same page → **Description / Subtitle / Keywords** | Paste from [APP_STORE_METADATA_COPY.md](./APP_STORE_METADATA_COPY.md) (4.1a-safe — no NFL/NBA/Premier League in marketing). |
| 5 | Same page → **In-App Purchases** | Attach **Premium Monthly** ($29.99/mo, 7-day trial). Status must be **Ready to Submit**. No separate “Pro” product. |
| 6 | [App Information](https://appstoreconnect.apple.com/apps/6762173223/distribution/info) | Support `https://octobetiq.com/support` · Privacy `https://octobetiq.com/privacy` · [Content Rights](#2-content-rights-information) |
| 7 | [App Privacy](https://appstoreconnect.apple.com/apps/6762173223/distribution/privacy) | Complete questionnaire → **Publish** (align with ATT — see [§4](#4-tracking-vs-app-privacy-must-match-binary)) |
| 8 | Version page → **App Review Information** | Demo: `appstore-review@octobetiq.com` / `AppReview2026!` |
| 9 | Version page | **Add for Review** → **Submit to App Review** |

### Before you click Submit

- [ ] Price schedule = **Free** (not paid app)
- [ ] Build **28** on version **1.0.0** (not 1.0.1 — no 1.0.1 binary exists)
- [ ] iPhone + iPad screenshots from **`asc-upload/`** folders
- [ ] Metadata matches [APP_STORE_METADATA_COPY.md](./APP_STORE_METADATA_COPY.md)
- [ ] Keywords use **`sports`** not `ports`
- [ ] Premium IAP attached on version page
- [ ] `https://octobetiq.com/support` and `/privacy` return **200**
- [ ] Description ends with Terms + Privacy URLs (in metadata copy file)
- [ ] RevenueCat production key `appl_…` in EAS secrets (not Test Store key)

### Resolution Center reply (if resubmitting after 4.1a)

```
Build 28 removes third-party league names from marketing copy and App Store screenshots.
In-app labels use generic competition wording (major professional football, basketball, and soccer).
Screenshots re-uploaded from asc-upload/ (iPhone 6.5" + iPad 13").

App is free to download; Premium is an optional in-app subscription ($29.99/mo).

Demo: appstore-review@octobetiq.com / AppReview2026!
```

### What's New (version 1.0.0)

```
Initial App Store release.

• AI win-probability picks across major professional competitions
• Personalized For You feed, Live hub, and game analysis
• Tracked model accuracy dashboard
• Premium subscription: unlimited picks, analysis, live updates, challenges, leaderboards
• Free tier with limited daily picks
```

### Notes to reviewer (optional)

```
Premium features require subscription — use demo account above or sandbox Apple ID.
Free tier: limited daily picks and ads. Not gambling or real-money betting.
Account deletion: Profile → Delete account.
ATT prompt is optional (AdMob). Guest browse: 3 teaser picks without account (in newer builds).
```

### Code not in build 28 (ship in next update)

These landed in git **after** build 28 — fine for review if not visible, or mention in notes:

- Guest browse (Home/Games without login)
- Model warming banner
- Leaderboard/challenge empty states
- Pre-kickoff accuracy lock (backend — deploy API separately)

**Backend:** Redeploy VPS API so accuracy, feed quality, and `/stats/model` match the app.

---

## Build upload failures (June 2026 — builds 29, 30, 1.0.2)

**Cause:** `eas build:version:set` was used to enter **1.0.1** — EAS stored that as the **build number** (CFBundleVersion), not the marketing version. Apple requires build numbers to be **integers** (28, 29, 31), not semver (1.0.1, 1.0.2). Hence **Failed** in Build Uploads.

**Submit now:** Use **build 28** (Complete) on **version 1.0.0** — no new build needed.

**Before the next EAS build**, reset the remote build number:

```bash
cd mobile
npx eas-cli build:version:set --platform ios
# When prompted "What version would you like to set?" enter: 31
# (integer only — NOT 1.0.1)
```

Marketing version **1.0.1** is set in `app.json` + `ios/octobetiQ/Info.plist`. Next successful build will be **1.0.1 (31)** for ASC version 1.0.1.

---

## Rejection fix (June 13, 2026 — build 28+)

Apple flagged **4.1(a)** marketing copy and screenshots that name third-party leagues (NFL, NBA, Premier League, etc.).

### Code fix (build 28+)

- **Landing / auth / home** — generic scope line in `leagues.ts` (no league trademarks in marketing strings)
- **League labels** — `Pro Football`, `Pro Basketball`, `English Soccer`, etc. in pickers and game cards
- **Accuracy screen** — methodology scope uses client copy even if API still returns legacy text
- **Backend** — `PRODUCT_SCOPE_SUMMARY` + `LEAGUES_LIST` labels updated (deploy API before or with build)
- **Screenshots** — re-captured `6.5-inch/` and `ipad-13-inch/` (Jun 13)

### App Store Connect (required)

1. **Description / subtitle / keywords** — use [APP_STORE_METADATA_COPY.md](./APP_STORE_METADATA_COPY.md) (no league trademarks)
2. **Screenshots** — re-upload all 10 iPhone 6.5" + iPad 13" PNGs from `app-store-screenshots/`
3. **View All Sizes in Media Manager** — confirm every iPad slot uses updated shots

### Reply to Apple (paste in Resolution Center)

```
Build 28 removes third-party league names from marketing copy and App Store screenshots.
Landing hero, accuracy methodology, and in-app labels now use generic competition wording
(e.g. “major professional football, basketball, and soccer competitions worldwide”).
Screenshots have been re-captured accordingly.

Demo: appstore-review@octobetiq.com / AppReview2026!
```

---

## Rejection fix (June 11, 2026 — build 26)

Apple rejected **4.1(a)** (copycats / league trademarks in metadata), **2.3.10** (Google Play in binary/screenshots), and **2.1(a)** (onboarding taps dead on iPad).

### Code fix (build 27+)

- **Onboarding** — fixed iPad taps: `Pressable`, pinned footer buttons, optimistic navigation (`OnboardingScreen.tsx`)
- **Landing** — removed Google Play on iOS; hero copy uses generic league wording (no Premier League / NFL / NBA in marketing line)
- **Paywall** — already shows $29.99 + legal footer (build 25+)

### App Store Connect (required)

1. **Subtitle / description / keywords** — remove trademarked league & team names (see [listing copy](#listing-copy-build-27) below)
2. **Screenshots** — re-capture **01-landing-hero** (no Google Play badge); check **View All Sizes in Media Manager** for every iPad slot
3. **Premium Monthly** — Ready to Submit + review screenshot attached; add to version **In-App Purchases and Subscriptions**
4. **Description** — keep Terms + Privacy URLs at the end
5. Upload build **27+**, attach Premium only, resubmit

### Reply to Apple (paste in Resolution Center)

```
Build 27 addresses all three issues:

1. Onboarding — Continue, Skip, and league chips now use fixed footer controls tested on iPad.
2. Google Play — removed from the iOS landing screen and updated screenshots.
3. Metadata — App Store description, subtitle, and keywords no longer reference third-party league trademarks; in-app league pickers are functional category labels only.

Demo: appstore-review@octobetiq.com / AppReview2026!
```

---

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

### Listing copy (build 27)

**Subtitle** (30 chars max):

```
AI sports picks & accuracy
```

**Promotional text** (optional, 170 chars):

```
Informational AI win-probability picks across major professional competitions. Tracked accuracy, favorites, challenges, and optional Premium for unlimited picks and in-play updates.
```

**Description:**

```
octobetiQ delivers informational AI sports picks — not betting advice.

COVERAGE
• International soccer, pro football, and pro basketball competitions
• Schedules, model picks, and tracked accuracy in one app

FEATURES
• Daily model picks ranked by confidence
• Personalized “For You” feed from your favorite leagues
• Game detail with win probability, explanations, and player prop projections (Premium)
• In-play score and probability updates while matches are on (Premium)
• Push alerts for high-confidence plays and game reminders
• Challenges and leaderboards (Premium)
• Free tier with limited daily picks; optional Premium subscription

TRANSPARENCY
We publish tracked model accuracy in the app. Picks are for entertainment and research — not financial or gambling advice.

SUBSCRIPTIONS
Premium is an optional auto-renewing subscription ($29.99/month; 7-day free trial where offered). Manage or cancel in iOS Settings → Apple ID → Subscriptions.

Support: https://octobetiq.com/support
Privacy: https://octobetiq.com/privacy
Terms of Use (EULA): https://octobetiq.com/terms
```

**Keywords** (100 chars, comma-separated, no spaces after commas):

```
sports,predictions,soccer,football,basketball,AI picks,accuracy,model,stats,analysis
```

### What's New (1.0.0, build 24)

```
Initial App Store release.

• AI predictions across major professional competitions
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

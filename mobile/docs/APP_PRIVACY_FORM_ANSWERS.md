# App Privacy questionnaire — octobetiQ (App ID 6762173223)

**You must complete this in App Store Connect** ([App Privacy](https://appstoreconnect.apple.com/apps/6762173223/distribution/privacy)) as **Account Holder or Admin**. This document matches the **current app binary** (login, AdMob, ATT, RevenueCat, push).

After publishing, the **tracking** answer must align with `NSUserTrackingUsageDescription` in the build.

---

## Step 1 — Do you collect data?

**Yes**, we collect data from this app.

---

## Step 2 — Data types to add

Add each row below. For every type: **Collected = Yes**, **Linked to user identity = Yes** (when user is logged in; ads may apply when logged out too).

### A. Contact Info

| Type | Purposes | Tracking |
|------|----------|----------|
| **Email Address** | App Functionality, Account Management | **No** |

*Register/login only; stored on your server.*

---

### B. Identifiers

| Type | Purposes | Tracking |
|------|----------|----------|
| **User ID** | App Functionality, Account Management, Analytics | **No** |
| **Device ID** | Third-Party Advertising, Analytics | **Yes** |

*User ID = your backend UUID. Device ID = IDFA / ad identifiers when user allows tracking (ATT) and AdMob initializes.*

---

### C. Purchases

| Type | Purposes | Tracking |
|------|----------|----------|
| **Purchase History** | App Functionality | **No** |

*Subscriptions via **RevenueCat** (App Store) and/or **Stripe**; tier stored on account.*

---

### D. Usage Data

| Type | Purposes | Tracking |
|------|----------|----------|
| **Product Interaction** | App Functionality, Analytics, Product Personalization | **No** |

*Favorites, leagues, games/predictions viewed, challenges, leaderboard views, pick history.*

| Type | Purposes | Tracking |
|------|----------|----------|
| **Advertising Data** | Third-Party Advertising, Analytics | **Yes** |

*Ad impressions/clicks via **Google AdMob** (free tier).*

| Type | Purposes | Tracking |
|------|----------|----------|
| **Other Usage Data** | Analytics | **No** |

*Optional: ad session counters sent to your API (`POST /analytics/ad-events`) — logged server-side only.*

---

### E. User Content

| Type | Purposes | Tracking |
|------|----------|----------|
| **Other User Content** | App Functionality, Product Personalization | **No** |

*Favorite teams/leagues selections (not free-text posts).*

---

### F. Diagnostics (optional but honest)

| Type | Purposes | Tracking |
|------|----------|----------|
| **Crash Data** | App Functionality | **No** |

*Only add if Expo/React Native crash reporting is enabled in production builds. If unsure, skip or answer No.*

| Type | Purposes | Tracking |
|------|----------|----------|
| **Performance Data** | App Functionality, Analytics | **No** |

*Same — add only if you use a crash/analytics SDK beyond server logs.*

---

### G. Other (push)

Apple sometimes lists under **Identifiers** or **Other**:

| Type | Purposes | Tracking |
|------|----------|----------|
| **Other Data Types** → describe *Push notification token* | App Functionality, Developer Communications | **No** |

*Expo push token stored when user enables notifications in Settings.*

---

## Step 3 — Tracking question (critical)

**Does your app or third-party partners use data for tracking?**

### → **Yes, we use data for tracking purposes**

Reason: the app includes **App Tracking Transparency** and **Google AdMob**, which may use the device identifier for cross-app advertising/measurement when the user taps **Allow**.

**Data used for tracking (select all that apply):**
- Device ID  
- Advertising Data  

**Third-party partners that receive tracking data:**
- **Google** (Google Mobile Ads / AdMob)

Do **not** select Email or Purchase History for tracking.

---

## Step 4 — Third-party SDK disclosure

When Apple asks which SDKs collect data, include at minimum:

| Partner | Data typically involved |
|---------|-------------------------|
| **Google** | Device ID, Advertising Data (AdMob) |
| **RevenueCat** | Purchase History, User ID (if prompted) |
| **Apple** | Purchase History (in-app purchases) |

---

## Step 5 — Privacy Policy URL

Use a public HTTPS URL (field limit **255 characters**):

```
https://octobetiq.com/privacy
```

Deploy: `scripts/deploy_web_legal.sh` (serves `web/privacy.html` at `/privacy`).

In-app policy text alone is **not** enough — Apple requires this URL.

**App Store Connect → App Privacy → English (U.S.) → Privacy Policy URL** (and App Information if shown).

---

## Step 6 — Publish

1. Review summary  
2. **Publish** (not just Save draft)  
3. Return to version → **Add for Review**

---

## Mismatch warning (fix later)

In-app `PrivacyPolicyScreen.tsx` says *"We do not use your data for advertising"*, but the app shows **ads** and requests **ATT**. The **App Store form must follow the binary** (tracking = Yes). Update in-app privacy text before public launch to mention AdMob and optional tracking consent.

---

## Quick copy-paste summary for “Notes to reviewer” (optional)

```
Privacy questionnaire declares email, user ID, product interaction, purchases, 
push tokens, and AdMob advertising data. Tracking = Yes (IDFA when user allows ATT). 
No data sold. Account deletion available in-app (Profile → Delete account).
```

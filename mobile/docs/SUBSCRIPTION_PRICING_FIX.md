# Fix “$9.99” on the App Store listing

The **live App Store page** shows “In-App Purchases” from **App Store Connect**, not from hardcoded app text. The app and landing page target **$29.99/month + 7-day trial**.

If the store still shows **$9.99**, fix these in order:

## 1. App Store Connect — subscription price (required)

1. [App Store Connect](https://appstoreconnect.apple.com/apps/6762173223/distribution/subscriptions) → **Subscriptions**
2. Open **Premium Monthly** (product id: `com.octobetiq.premium.monthly`)
3. **Subscription Prices** → set **United States** (and other territories) to **$29.99**
4. If you see **$9.99**, add a **Price Change** → **$29.99** (Apple may schedule; confirm effective date)
5. **Free Trial** → **7 days** for eligible new subscribers
6. Save → wait for status **Ready to Submit** / **Approved**

The product page “In-App Purchases” line updates after Apple processes the price (can take hours).

## 2. Version page — correct IAP attached

1. **Distribution → iOS App → current version**
2. **In-App Purchases and Subscriptions** → only **Premium Monthly** (remove old Pro / $9.99 products if any)
3. Save

## 3. RevenueCat — production App Store product

1. [RevenueCat](https://app.revenuecat.com) → **octobetiQ** → **Products**
2. iOS product **`com.octobetiq.premium.monthly`** must link to the **App Store** product (not Test Store only)
3. **Offerings → current** → default package uses that product
4. **Entitlement** `premium` attached to that product

## 4. EAS — production RevenueCat key

Production builds must use an **`appl_`** SDK key, not `test_`:

```bash
cd mobile
eas secret:list   # EXPO_PUBLIC_REVENUECAT_IOS_KEY should start with appl_
```

If missing, create in RevenueCat → Project → API keys → **Apple App Store**, then:

```bash
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_XXXX --scope project
```

Rebuild and submit after changing the key.

## 5. Stripe (web checkout fallback only)

Web checkout uses Stripe **Price** objects, not App Store tiers.

- `STRIPE_PRICE_ID_PREMIUM` must point to a **$29.99/month** price in Stripe Dashboard (live mode on production API).
- Old $9.99 Stripe prices should be archived; do not reference them in `.env.production`.

## 6. Verify in the app

After ASC + RevenueCat are aligned:

1. Install **TestFlight build 28+** (not Expo Go)
2. Profile → **Subscription**
3. Premium card and legal footer should show **$29.99/month** and **7-day free trial**
4. Tap subscribe — Apple payment sheet should show **$29.99** after trial

## 7. “In-app purchase is not available right now” (empty offerings)

The paywall shows this when **RevenueCat returns zero packages** (not a network error). Fix in this order:

### App Store Connect

1. **Agreements, Tax, and Banking** → **Paid Applications** agreement must be **Active**
2. **Subscriptions** → **Premium Monthly** (`com.octobetiq.premium.monthly`) → status **Ready to Submit** or **Approved**
3. **Distribution → iOS App → version 1.0.1** → **In-App Purchases and Subscriptions** includes **Premium Monthly**
4. Subscription group, localization, and 7-day trial completed

### RevenueCat dashboard

1. **Project Settings → Apps** → iOS app **bundle id** matches `com.sportsprediction.app`
2. **App Store Connect API** or **Shared Secret** configured (Products → iOS → sync)
3. **Products** → `com.octobetiq.premium.monthly` linked to **App Store** (not Test Store only)
4. **Entitlements** → `premium` includes that product
5. **Offerings** → one offering marked **Current** (e.g. `default`) with a **monthly** package pointing at Premium Monthly

If step 5 is wrong, the app now falls back to `default` or the first offering — but **no offering at all** still blocks purchase.

### TestFlight / Review

- Use a **TestFlight or App Store build** (build 35+). Expo Go cannot load real IAP.
- Sandbox: Settings → App Store → Sandbox Account (for manual testing)
- After RC/ASC changes, wait **15–60 minutes**, then tap **Retry** on the paywall alert

### Diagnose in the app (build with latest paywall)

The subscription alert now appends the RevenueCat error, e.g.:

- `No offerings in RevenueCat…` → complete RC product + offering setup
- `No current offering…` → mark an offering as **Current** in RC
- `Offering has no packages…` → attach product to the offering package

## Quick reference

| Surface | Source of truth |
|--------|------------------|
| App Store listing “In-App Purchases” | ASC subscription price tier |
| Paywall UI | StoreKit via RevenueCat, fallback `$29.99` in code |
| Landing pricing | `$29.99/mo` in app |
| Description | `APP_STORE_METADATA_COPY.md` |

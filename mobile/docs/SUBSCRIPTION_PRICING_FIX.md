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

## Quick reference

| Surface | Source of truth |
|--------|------------------|
| App Store listing “In-App Purchases” | ASC subscription price tier |
| Paywall UI | StoreKit via RevenueCat, fallback `$29.99` in code |
| Landing pricing | `$29.99/mo` in app |
| Description | `APP_STORE_METADATA_COPY.md` |

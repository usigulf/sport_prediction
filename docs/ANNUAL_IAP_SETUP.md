# Annual Premium IAP setup (W33 / I41)

In-repo code supports annual billing on **Stripe (web)** and **RevenueCat (iOS/Android)**. The remaining step is creating the App Store product and linking it in RevenueCat.

## Shipped in repo

| Piece | Location |
|-------|----------|
| Stripe annual price | `STRIPE_PRICE_ID_PREMIUM_ANNUAL` in `.env.production.example` |
| Checkout API | `POST /subscription/checkout` with `billing_period: "annual"` |
| Paywall toggle | `mobile/src/screens/PaywallScreen.tsx` — hidden until RevenueCat package exists |
| Product ID | `com.octobetiq.premium.annual` in `subscriptionPricing.ts` |
| Tests | `backend/tests/test_annual_subscription_plan.py` |

Verify scaffold (no ASC login required):

```bash
bash scripts/verify_annual_iap_scaffold.sh
```

## App Store Connect

1. [App Store Connect → octobetiQ → Subscriptions](https://appstoreconnect.apple.com/)
2. Under the Premium subscription group, **+** add subscription:
   - **Reference name:** Premium Annual
   - **Product ID:** `com.octobetiq.premium.annual`
   - **Duration:** 1 year
   - **Price:** $299.99/yr (or your target; update `PREMIUM_ANNUAL_PRICE_LABEL` in mobile if changed)
3. Localizations + review screenshot (reuse monthly paywall screenshot)
4. Status → **Ready to Submit** (attach to next app version)

## RevenueCat

1. [RevenueCat → Products](https://app.revenuecat.com/) → link `com.octobetiq.premium.annual`
2. **Offerings → default** → add **Annual** package pointing at the annual product
3. Entitlement remains `premium` (same as monthly)
4. Sandbox test: purchase annual in TestFlight → confirm webhook sets tier `premium`

After the offering includes an annual package, the Paywall **Annual** toggle appears automatically (`annualBillingAvailable`).

## Stripe (web subscribers)

1. Stripe Dashboard → **Products** → Premium → **Add price** → recurring yearly
2. Copy price id → `STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_xxx` in `.env.production`
3. Test: `POST /api/v1/subscription/checkout` with `{"tier":"premium","billing_period":"annual"}`

## Pre-launch checklist

- [ ] ASC product `com.octobetiq.premium.annual` Ready to Submit
- [ ] RevenueCat offering includes annual package
- [ ] Paywall shows Annual toggle in TestFlight build
- [ ] Stripe annual price id in production env
- [ ] `bash scripts/verify_annual_iap_scaffold.sh` passes in CI

See also `mobile/docs/ASC_SUBMIT_1.0.1.md` and `docs/SUBSCRIPTION_TIERS.md`.

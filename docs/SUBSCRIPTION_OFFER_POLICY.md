# Subscription offer policy (audit #19)

In-repo **self-audit scaffold** for redesigning the Premium offer after retention and value evidence.

> This closes external audit **#19** as a pricing **policy**, founder-phase constants,
> funnel event names, and a verify script. **It is not evidence** that D7/D30 retention,
> trial→paid conversion, or `public_charge` model gates have been met in production.

## Why redesign

External review: **$29.99/mo** matches mature incumbents while the shipped model and
live/props surface are still invite-beta grade. Do not market that list price as the
default until objective gates pass.

## Offer phases

| Phase | Intent | Marketing list price | Checkout source of truth |
|-------|--------|----------------------|--------------------------|
| `invite_founder` | Invite / TestFlight / Play internal | **$9.99/mo**, **$99.99/yr** | RevenueCat / ASC / Stripe SKUs must match; never imply a price the store will not charge |
| `public_list` | After evidence gates | **$29.99/mo**, **$299.99/yr** | Same — store packages must be promoted |

Mobile default: `invite_founder` via `ACTIVE_OFFER_PHASE` in
`mobile/src/constants/subscriptionPricing.ts` (override with
`EXPO_PUBLIC_OFFER_PHASE=public_list` when ops flips).

## Evidence gates before `public_list`

All must be true (ops-recorded; not auto-flipped by this scaffold):

| Gate | Source |
|------|--------|
| Model `public_charge` acceptance | `docs/MODEL_ACCEPTANCE_PROTOCOL.md` / `GET /stats/model-acceptance?level=public_charge` |
| Retention | PostHog (or equivalent) D7 ≥ target in `mobile/docs/PRODUCT_EXECUTION_PLAN.md` |
| Trial → paid | Cohort conversion at or above plan target |
| Durable benefits only | Paywall bullets match shipped features — no stub live/props marketing |

Until then: keep `invite_founder`, soccer-wedge positioning, and honest low-trust UI.

## Durable benefits (paywall-allowed)

| Allowed now | Deferred until proven |
|-------------|------------------------|
| Unlimited soccer picks + history | “Win more” / beat-the-market claims |
| AI explanations when `prediction_source` is trusted | Full live trading / props as core value |
| Ad-free | Rewarded unlock of analysis as primary monetization |
| Alerts / favorites workflow | Multi-sport Premium parity |

## Analytics (instrumentation scaffold)

Event names in `mobile/src/constants/analyticsEvents.ts`:

- `paywall_viewed`, `paywall_cta_tapped`, `paywall_experiment_viewed`
- `trial_started`, `trial_converted`, `subscription_activated`, `subscription_cancelled`

Cohort retention (D1/D7/D30) remains **ops-owned in PostHog** — not claimed by CI.

## ASC / RevenueCat ops checklist

1. Create founder monthly/annual products **or** App Store intro offer at founder price  
2. Map packages in RevenueCat offering used by the invite build  
3. Confirm TestFlight checkout shows founder price end-to-end  
4. Only after evidence gates: promote `$29.99` / `$299.99` packages and set
   `EXPO_PUBLIC_OFFER_PHASE=public_list` on the production EAS profile  
5. Update App Store promotional text to match phase  

See also `docs/ANNUAL_IAP_SETUP.md`, `docs/SUBSCRIPTION_TIERS.md`.

## Run log (ops)

| Field | Value |
|-------|-------|
| Date (UTC) | |
| Phase | invite_founder / public_list |
| Model acceptance level | |
| D7 retention | |
| Trial→paid | |
| Store SKU prices verified | |
| Operator | |

## Verify (no App Store login)

```bash
bash scripts/verify_subscription_offer_scaffold.sh
bash scripts/verify_audit_scaffolds.sh
```

## Related

- `docs/MODEL_ACCEPTANCE_PROTOCOL.md`
- `docs/PRODUCTION_REALITY.md`
- `docs/ACCURACY_SCORECARD.md`
- `mobile/docs/PRODUCT_EXECUTION_PLAN.md`

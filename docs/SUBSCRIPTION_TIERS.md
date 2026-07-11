# Subscription tiers (W45)

octobetiQ exposes three canonical tiers in API and mobile code:

| Tier | API value | App experience |
|------|-----------|----------------|
| Free | `free` | Daily pick limits, ads, locked analysis |
| Premium | `premium` | Unlimited picks, live updates, no ads |
| Legacy Pro | `premium_plus` / `pro` | Same access as Premium (grandfathered API alias) |

## Paywall shows Premium only (by design)

The in-app Paywall presents a **single paid SKU — Premium** — to reduce App Store complexity and align with RevenueCat offerings (`premium` entitlement). Users on legacy `premium_plus` or Stripe `pro` retain full access via `backend/app/utils/subscription_tiers.py` normalization.

There is no separate Pro marketing tier in the mobile Paywall. Enterprise/API tier is out of scope for consumer app v1.

## Backend gating

All tier checks go through `subscription_tiers.py`:

- `has_paid_access(tier)` — premium features, live WebSocket, player props
- `normalize_tier(raw)` — maps `pro` → `premium_plus`, `trialing` → `premium`

## Related audit items

- **W33 / I41** Annual IAP — code supports annual billing; ASC product `com.octobetiq.premium.annual` still required in App Store Connect
- **I87** Price experiment — messaging via feature flags; checkout price comes from RevenueCat/Stripe

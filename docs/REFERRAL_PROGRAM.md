# Referral program (W34 / I42)

## In-app (shipped)

| Piece | Location |
|-------|----------|
| Invite code API | `GET /api/v1/user/referral/code` |
| Apply code API | `POST /api/v1/user/referral/apply` |
| Profile UI | `mobile/src/components/ReferralSection.tsx` |
| Share pick link | `SharePickCard` includes referral when signed in |

Users can share their invite code and apply a friend's code. Referrals are tracked on the account in Postgres.

## Bonus trial days (external setup)

Bonus days are **not** granted automatically in-app today. Wire one of:

### App Store Connect (iOS)

1. App Store Connect → **Subscriptions** → create a **Promotional Offer** or **Offer Code** for Premium monthly.
2. RevenueCat → map the offer to entitlement `premium`.
3. Backend: on successful `referral/apply`, store `referral_bonus_pending` and expose a deep link or in-app CTA that triggers RevenueCat promotional purchase (requires native SDK offer APIs).

### Stripe (web checkout)

1. Stripe Dashboard → **Coupons** → e.g. `REFERRAL7` (7 extra trial days or % off first month).
2. Set `STRIPE_REFERRAL_COUPON_ID` in backend env (when implemented).
3. `POST /subscription/checkout` accepts optional `referral_code` and applies coupon when valid.

### Minimum viable ops workaround

Until promo APIs are wired, ops can manually extend trials via RevenueCat customer dashboard or Stripe subscription metadata when support verifies a valid referral pair.

## Feature flag

`referral_program` in `GET /config/feature-flags` — set `FEATURE_REFERRAL_PROGRAM=false` to hide Profile section without removing API.

## Compliance

- Copy must not promise guaranteed winnings or betting outcomes.
- Referral rewards should be framed as subscription benefits (trial extension), not cash or gambling credits.

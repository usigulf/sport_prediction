/**
 * Subscription tier helpers — align with backend `subscription_tier` and Paywall checkout ids.
 */

export type NormalizedTier = 'free' | 'premium' | 'premium_plus';

/** Single source for tier normalization (legacy aliases, Stripe trial). */
export function normalizeSubscriptionTier(raw: string | undefined): NormalizedTier {
  if (!raw) return 'free';
  const x = String(raw).trim().toLowerCase();
  if (x === 'pro') return 'premium_plus';
  if (x === 'trialing') return 'premium';
  if (x === 'premium' || x === 'premium_plus') return x;
  return 'free';
}

/** Premium or Pro — full access to predictions, explanations, props, live updates (see API). */
export function hasPremiumAccess(raw: string | undefined): boolean {
  const t = normalizeSubscriptionTier(raw);
  return t === 'premium' || t === 'premium_plus';
}

/** Challenges & leaderboards — included in Premium (legacy premium_plus still works). */
export function hasProAccess(raw: string | undefined): boolean {
  return hasPremiumAccess(raw);
}

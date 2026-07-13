/**
 * Canonical Premium pricing — must match App Store Connect / RevenueCat / Stripe
 * for the active offer phase (audit #19). See docs/SUBSCRIPTION_OFFER_POLICY.md.
 *
 * invite_founder: lower list until retention + public_charge evidence.
 * public_list: $29.99 / $299.99 after gates (ops flip EXPO_PUBLIC_OFFER_PHASE).
 */
export type OfferPhase = 'invite_founder' | 'public_list';

function resolveOfferPhase(): OfferPhase {
  const raw = (process.env.EXPO_PUBLIC_OFFER_PHASE || 'invite_founder').toLowerCase();
  return raw === 'public_list' ? 'public_list' : 'invite_founder';
}

/** Active marketing phase. Store checkout remains source of truth at purchase. */
export const ACTIVE_OFFER_PHASE: OfferPhase = resolveOfferPhase();

export const FOUNDER_MONTHLY_PRICE_USD = 9.99;
export const FOUNDER_MONTHLY_PRICE_LABEL = '$9.99';
export const FOUNDER_ANNUAL_PRICE_USD = 99.99;
export const FOUNDER_ANNUAL_PRICE_LABEL = '$99.99';

export const PUBLIC_LIST_MONTHLY_PRICE_USD = 29.99;
export const PUBLIC_LIST_MONTHLY_PRICE_LABEL = '$29.99';
export const PUBLIC_LIST_ANNUAL_PRICE_USD = 299.99;
export const PUBLIC_LIST_ANNUAL_PRICE_LABEL = '$299.99';

/** Phase-aware canonical monthly (marketing / footer fallback). */
export const PREMIUM_MONTHLY_PRICE_USD =
  ACTIVE_OFFER_PHASE === 'public_list'
    ? PUBLIC_LIST_MONTHLY_PRICE_USD
    : FOUNDER_MONTHLY_PRICE_USD;
export const PREMIUM_MONTHLY_PRICE_LABEL =
  ACTIVE_OFFER_PHASE === 'public_list'
    ? PUBLIC_LIST_MONTHLY_PRICE_LABEL
    : FOUNDER_MONTHLY_PRICE_LABEL;

export const PREMIUM_ANNUAL_PRICE_USD =
  ACTIVE_OFFER_PHASE === 'public_list'
    ? PUBLIC_LIST_ANNUAL_PRICE_USD
    : FOUNDER_ANNUAL_PRICE_USD;
export const PREMIUM_ANNUAL_PRICE_LABEL =
  ACTIVE_OFFER_PHASE === 'public_list'
    ? PUBLIC_LIST_ANNUAL_PRICE_LABEL
    : FOUNDER_ANNUAL_PRICE_LABEL;

export const PREMIUM_TRIAL_DAYS = 7;

/** Must match App Store Connect + RevenueCat iOS products for the active phase. */
export const PREMIUM_IOS_PRODUCT_ID = 'com.octobetiq.premium.monthly';
export const PREMIUM_IOS_PRODUCT_ID_ANNUAL = 'com.octobetiq.premium.annual';
export const PREMIUM_IOS_PRODUCT_ID_FOUNDER = 'com.octobetiq.premium.founder.monthly';
export const PREMIUM_IOS_PRODUCT_ID_FOUNDER_ANNUAL = 'com.octobetiq.premium.founder.annual';

export type BillingPeriod = 'monthly' | 'annual';

const LEGACY_TEST_STORE_PRICE = /^\$9\.99(\s*USD)?$/i;

/**
 * Price shown on paywall and legal footer.
 * Uses StoreKit `priceString` when it looks like production billing; otherwise canonical.
 * Note: Test Store often returns $9.99 — that matches founder phase; for public_list
 * we still replace legacy test strings with the public list label.
 */
export function displayPremiumMonthlyPrice(storePriceString?: string | null): string {
  const canonical = PREMIUM_MONTHLY_PRICE_LABEL;
  const raw = storePriceString?.trim();
  if (!raw) return canonical;
  if (LEGACY_TEST_STORE_PRICE.test(raw)) {
    return ACTIVE_OFFER_PHASE === 'invite_founder' ? raw.replace(/\s*USD$/i, '').trim() || canonical : canonical;
  }
  return raw;
}

export function displayPremiumAnnualPrice(storePriceString?: string | null): string {
  const canonical = PREMIUM_ANNUAL_PRICE_LABEL;
  const raw = storePriceString?.trim();
  if (!raw) return canonical;
  if (LEGACY_TEST_STORE_PRICE.test(raw)) return canonical;
  return raw;
}

export function premiumMonthlyPriceWithPeriod(storePriceString?: string | null): string {
  return `${displayPremiumMonthlyPrice(storePriceString)}/month`;
}

export function premiumAnnualPriceWithPeriod(storePriceString?: string | null): string {
  return `${displayPremiumAnnualPrice(storePriceString)}/year`;
}

/** Approximate savings vs paying monthly for 12 months. */
export function premiumAnnualSavingsPercent(): number {
  const monthlyYear = PREMIUM_MONTHLY_PRICE_USD * 12;
  if (monthlyYear <= 0) return 0;
  return Math.round(((monthlyYear - PREMIUM_ANNUAL_PRICE_USD) / monthlyYear) * 100);
}

export function offerPhaseHeadline(): string {
  if (ACTIVE_OFFER_PHASE === 'invite_founder') {
    return 'Invite founder pricing — soccer Premium while we prove the model';
  }
  return 'Premium — unlimited trusted soccer picks and analysis';
}

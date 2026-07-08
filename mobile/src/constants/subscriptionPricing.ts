/**
 * Canonical Premium pricing — must match App Store Connect subscription tiers.
 * Monthly: $29.99/mo + 7-day trial. Annual: $299.99/yr (~17% vs monthly).
 */
export const PREMIUM_MONTHLY_PRICE_USD = 29.99;
export const PREMIUM_MONTHLY_PRICE_LABEL = '$29.99';
export const PREMIUM_ANNUAL_PRICE_USD = 299.99;
export const PREMIUM_ANNUAL_PRICE_LABEL = '$299.99';
export const PREMIUM_TRIAL_DAYS = 7;

/** Must match App Store Connect + RevenueCat iOS products. */
export const PREMIUM_IOS_PRODUCT_ID = 'com.octobetiq.premium.monthly';
export const PREMIUM_IOS_PRODUCT_ID_ANNUAL = 'com.octobetiq.premium.annual';

export type BillingPeriod = 'monthly' | 'annual';

const LEGACY_TEST_STORE_PRICE = /^\$9\.99(\s*USD)?$/i;

/**
 * Price shown on paywall and legal footer.
 * Uses StoreKit `priceString` when it looks like production billing; otherwise canonical.
 */
export function displayPremiumMonthlyPrice(storePriceString?: string | null): string {
  const canonical = PREMIUM_MONTHLY_PRICE_LABEL;
  const raw = storePriceString?.trim();
  if (!raw) return canonical;
  if (LEGACY_TEST_STORE_PRICE.test(raw)) return canonical;
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

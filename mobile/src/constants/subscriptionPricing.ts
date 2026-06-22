/**
 * Canonical Premium pricing — must match App Store Connect subscription tier ($29.99/mo).
 * StoreKit / RevenueCat may return $9.99 from Test Store or an outdated ASC price tier;
 * marketing and legal copy use canonical unless production StoreKit confirms otherwise.
 */
export const PREMIUM_MONTHLY_PRICE_USD = 29.99;
export const PREMIUM_MONTHLY_PRICE_LABEL = '$29.99';
export const PREMIUM_TRIAL_DAYS = 7;

/** Must match App Store Connect + RevenueCat iOS product. */
export const PREMIUM_IOS_PRODUCT_ID = 'com.octobetiq.premium.monthly';

const LEGACY_TEST_STORE_PRICE = /^\$9\.99(\s*USD)?$/i;

/**
 * Price shown on paywall and legal footer.
 * Uses StoreKit `priceString` when it looks like production billing; otherwise canonical $29.99.
 */
export function displayPremiumMonthlyPrice(storePriceString?: string | null): string {
  const canonical = PREMIUM_MONTHLY_PRICE_LABEL;
  const raw = storePriceString?.trim();
  if (!raw) return canonical;
  if (LEGACY_TEST_STORE_PRICE.test(raw)) return canonical;
  return raw;
}

export function premiumMonthlyPriceWithPeriod(storePriceString?: string | null): string {
  return `${displayPremiumMonthlyPrice(storePriceString)}/month`;
}

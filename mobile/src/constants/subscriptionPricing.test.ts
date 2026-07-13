import {
  ACTIVE_OFFER_PHASE,
  FOUNDER_MONTHLY_PRICE_LABEL,
  PUBLIC_LIST_MONTHLY_PRICE_LABEL,
  displayPremiumMonthlyPrice,
  offerPhaseHeadline,
  premiumAnnualSavingsPercent,
} from './subscriptionPricing';

describe('subscriptionPricing offer phases', () => {
  it('defaults to invite_founder phase with founder list price', () => {
    expect(ACTIVE_OFFER_PHASE).toBe('invite_founder');
    expect(displayPremiumMonthlyPrice(null)).toBe(FOUNDER_MONTHLY_PRICE_LABEL);
    expect(offerPhaseHeadline().toLowerCase()).toContain('founder');
  });

  it('prefers real store price strings over canonical', () => {
    expect(displayPremiumMonthlyPrice('$12.99')).toBe('$12.99');
  });

  it('keeps public list label constant for ops flip documentation', () => {
    expect(PUBLIC_LIST_MONTHLY_PRICE_LABEL).toBe('$29.99');
  });

  it('computes annual savings vs monthly', () => {
    expect(premiumAnnualSavingsPercent()).toBeGreaterThan(0);
  });
});

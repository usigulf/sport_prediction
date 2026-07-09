import {
  normalizeSubscriptionTier,
  hasPremiumAccess,
  hasProAccess,
} from './subscription';

describe('normalizeSubscriptionTier', () => {
  it('maps legacy pro to premium_plus', () => {
    expect(normalizeSubscriptionTier('pro')).toBe('premium_plus');
  });

  it('maps trialing to premium', () => {
    expect(normalizeSubscriptionTier('trialing')).toBe('premium');
  });

  it('defaults empty to free', () => {
    expect(normalizeSubscriptionTier(undefined)).toBe('free');
  });
});

describe('hasPremiumAccess', () => {
  it('grants premium and premium_plus', () => {
    expect(hasPremiumAccess('premium')).toBe(true);
    expect(hasPremiumAccess('premium_plus')).toBe(true);
    expect(hasPremiumAccess('trialing')).toBe(true);
  });

  it('denies free', () => {
    expect(hasPremiumAccess('free')).toBe(false);
  });
});

describe('hasProAccess', () => {
  it('matches premium access', () => {
    expect(hasProAccess('premium')).toBe(true);
    expect(hasProAccess('free')).toBe(false);
  });
});

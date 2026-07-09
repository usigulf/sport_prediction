import {
  adDensitySpacing,
  introOfferLabel,
  isOddsDisplayEnabled,
  isPlayerPropsEnabled,
  rewardedAdsCopy,
  trialDaysFromServer,
} from '../utils/resolvedFeatureFlags';

describe('resolvedFeatureFlags', () => {
  it('falls back to env when server flags unset', () => {
    expect(isOddsDisplayEnabled({})).toBe(
      process.env.EXPO_PUBLIC_ODDS_DISPLAY_ENABLED === 'true',
    );
  });

  it('uses server odds_display override', () => {
    expect(isOddsDisplayEnabled({ odds_display: true })).toBe(true);
    expect(isOddsDisplayEnabled({ odds_display: false })).toBe(false);
  });

  it('uses server player_props override', () => {
    expect(isPlayerPropsEnabled({ player_props: true })).toBe(true);
  });

  it('reads trial length from experiments', () => {
    expect(trialDaysFromServer({ experiments: { trial_length_days: 14 } })).toBe(14);
    expect(trialDaysFromServer({})).toBe(7);
  });

  it('maps ad density to spacing', () => {
    expect(adDensitySpacing({ experiments: { ad_density: 'reduced' } })).toBe(10);
    expect(adDensitySpacing({ experiments: { ad_density: 'low' } })).toBe(10);
    expect(adDensitySpacing({ experiments: { ad_density: 'high' } })).toBe(4);
    expect(adDensitySpacing({})).toBe(6);
  });

  it('maps rewarded ads messaging variants', () => {
    const premium = rewardedAdsCopy(
      { experiments: { rewarded_ads_messaging: 'premium_focus' } },
      15,
    );
    expect(premium.primaryCta).toContain('Premium');
    const rewarded = rewardedAdsCopy(
      { experiments: { rewarded_ads_messaging: 'rewarded_unlock' } },
      15,
    );
    expect(rewarded.primaryCta).toContain('Watch ad');
  });

  it('shows intro offer label for winback bucket', () => {
    expect(introOfferLabel({ experiments: { intro_offer_variant: 'winback_20pct' } })).toMatch(
      /20%/,
    );
    expect(introOfferLabel({})).toBeNull();
  });
});

import { ODDS_DISPLAY_ENABLED, PLAYER_PROPS_ENABLED } from '../constants/featureFlags';
import type { ServerFeatureFlags } from '../hooks/useServerFeatureFlags';

export function isOddsDisplayEnabled(flags: ServerFeatureFlags): boolean {
  if (typeof flags.odds_display === 'boolean') return flags.odds_display;
  return ODDS_DISPLAY_ENABLED;
}

export function isPlayerPropsEnabled(flags: ServerFeatureFlags): boolean {
  if (typeof flags.player_props === 'boolean') return flags.player_props;
  return PLAYER_PROPS_ENABLED;
}

export function trialDaysFromServer(flags: ServerFeatureFlags): number {
  const days = flags.experiments?.trial_length_days;
  if (typeof days === 'number' && days >= 1 && days <= 30) return Math.round(days);
  return 7;
}

export function adDensitySpacing(flags: ServerFeatureFlags): number {
  const density = (flags.experiments?.ad_density || 'standard').toLowerCase();
  if (density === 'reduced' || density === 'low') return 10;
  if (density === 'high') return 4;
  return 6;
}

export type RewardedAdsCopy = {
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
};

export function rewardedAdsCopy(flags: ServerFeatureFlags, unlockMinutes: number): RewardedAdsCopy {
  const variant = (flags.experiments?.rewarded_ads_messaging || 'rewarded_unlock').toLowerCase();
  if (variant === 'premium_focus') {
    return {
      title: 'Go Premium for full analysis',
      body:
        'Skip ads and unlock confidence details, live context, and richer breakdowns on every game. Basic picks stay free.',
      primaryCta: 'View Premium plans',
      secondaryCta: `Or watch a short ad for ~${unlockMinutes} min unlock`,
    };
  }
  return {
    title: 'Unlock full AI analysis',
    body:
      `Optional: watch a short video to reveal confidence details and richer context for about ${unlockMinutes} minutes. Basic pick info stays available without this.`,
    primaryCta: 'Watch ad to unlock',
    secondaryCta: 'Or subscribe for unlimited access',
  };
}

export function introOfferLabel(flags: ServerFeatureFlags): string | null {
  const variant = (flags.experiments?.intro_offer_variant || 'none').toLowerCase();
  if (variant === 'winback_20pct') return 'Welcome back — 20% off your first month';
  return null;
}

/** Experiment bucket for paywall price messaging (I87). Store/RevenueCat remains source of truth at checkout. */
export const PAYWALL_EXPERIMENT_MONTHLY_LABEL = '$19.99';

export function isPaywallDiscountTier(flags: ServerFeatureFlags): boolean {
  return (flags.experiments?.paywall_price_tier || 'standard').toLowerCase() === 'discount';
}

export function paywallPricePromoLabel(flags: ServerFeatureFlags): string | null {
  if (!isPaywallDiscountTier(flags)) return null;
  return `Limited-time offer — ${PAYWALL_EXPERIMENT_MONTHLY_LABEL}/mo messaging tier (checkout uses store price)`;
}

/** Reference list price shown struck-through when user is in the discount experiment bucket. */
export function paywallReferenceMonthlyPrice(flags: ServerFeatureFlags): string | null {
  if (!isPaywallDiscountTier(flags)) return null;
  return '$29.99';
}

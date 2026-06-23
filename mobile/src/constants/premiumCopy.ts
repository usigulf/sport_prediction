import { PLAYER_PROPS_ENABLED } from './featureFlags';
import { PREMIUM_TRIAL_DAYS } from './subscriptionPricing';

const CORE_BENEFITS = 'unlimited picks, full analysis, live updates';

/** Paywall / upgrade sheet one-liner (no player props when feature is off). */
export const PREMIUM_PAYWALL_CONTEXT = PLAYER_PROPS_ENABLED
  ? `Premium: ${CORE_BENEFITS}, and player props. ${PREMIUM_TRIAL_DAYS}-day free trial.`
  : `Premium: ${CORE_BENEFITS}. ${PREMIUM_TRIAL_DAYS}-day free trial.`;

/** Landing pricing card bullet list. */
export const PREMIUM_LANDING_FEATURES_LINE = PLAYER_PROPS_ENABLED
  ? 'Unlimited AI picks, challenges, leaderboards, in-play updates, player props, ad-free'
  : 'Unlimited AI picks, challenges, leaderboards, in-play updates, ad-free';

/** Default house-ad subtitle when callers do not override. */
export const HOUSE_PROMO_SUBTITLE = PLAYER_PROPS_ENABLED
  ? 'Full analysis, live updates & player props. 7-day trial.'
  : 'Full analysis, live updates & ad-free. 7-day trial.';

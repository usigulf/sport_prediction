import { PLAYER_PROPS_ENABLED } from './featureFlags';
import { PREMIUM_TRIAL_DAYS } from './subscriptionPricing';

const CORE_BENEFITS = 'unlimited soccer picks, explanations, ad-free feed';

/** Paywall / upgrade sheet one-liner (no player props when feature is off). */
export const PREMIUM_PAYWALL_CONTEXT = PLAYER_PROPS_ENABLED
  ? `Premium: ${CORE_BENEFITS}, and experimental player props. ${PREMIUM_TRIAL_DAYS}-day free trial.`
  : `Premium: ${CORE_BENEFITS}. ${PREMIUM_TRIAL_DAYS}-day free trial.`;

/** Landing pricing card bullet list. */
export const PREMIUM_LANDING_FEATURES_LINE = PLAYER_PROPS_ENABLED
  ? 'Unlimited soccer picks, explanations, challenges, experimental props, ad-free'
  : 'Unlimited soccer picks, explanations, challenges, ad-free';

/** Default house-ad subtitle when callers do not override. */
export const HOUSE_PROMO_SUBTITLE = PLAYER_PROPS_ENABLED
  ? 'Full analysis & experimental props. 7-day trial.'
  : 'Full analysis & ad-free. 7-day trial.';

/** Paywall copy when upgrading for player props (props feature on). */
export const PREMIUM_PROPS_UNLOCK_CONTEXT = `Premium unlocks ${CORE_BENEFITS}, and experimental player props.`;

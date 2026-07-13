/**
 * Plan capability matrix (product + backend). Used for copy and upgrade routing.
 */
import { PLAYER_PROPS_ENABLED } from './featureFlags';
import { BETA_SOCCER_ONLY } from './leagues';
import { PREMIUM_MONTHLY_PRICE_LABEL, PREMIUM_TRIAL_DAYS } from './subscriptionPricing';

const FREE_LEAGUES_LINE = BETA_SOCCER_ONLY
  ? 'Browse major international soccer schedules'
  : 'Browse games and schedules across major professional competitions';

export const PLAN_MATRIX = {
  free: [
    FREE_LEAGUES_LINE,
    'Limited model picks per day (daily cap)',
    'Favorites and basic home feed',
    'Includes ads (removed on Premium)',
    'See upgrade prompts when a feature needs Premium',
  ],
  premium: [
    'Unlimited soccer predictions & pick history',
    'Full AI explanations when the model is publish-ready',
    'Ad-free experience',
    'Favorites, alerts workflow, and pick history',
    'Challenges and leaderboards',
    ...(PLAYER_PROPS_ENABLED
      ? (['Experimental player props (not a launch promise)'] as const)
      : []),
    `${PREMIUM_TRIAL_DAYS}-day free trial, then ${PREMIUM_MONTHLY_PRICE_LABEL}/mo`,
  ],
} as const;

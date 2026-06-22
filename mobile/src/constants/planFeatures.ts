/**
 * Plan capability matrix (product + backend). Used for copy and upgrade routing.
 */
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
    'Unlimited predictions & pick history',
    'Full AI explanations and analysis',
    'In-play win-probability updates while a match is on (informational — not betting odds)',
    'Player props and game spotlights',
    'Challenges and leaderboards',
    'Ad-free experience',
    `${PREMIUM_TRIAL_DAYS}-day free trial, then ${PREMIUM_MONTHLY_PRICE_LABEL}/mo`,
  ],
} as const;

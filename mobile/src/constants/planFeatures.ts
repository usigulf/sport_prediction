/**
 * Plan capability matrix (product + backend). Used for copy and upgrade routing.
 *
 * Backend enforces Pro tier on /challenges and /leaderboards.
 */
import { BETA_SOCCER_ONLY } from './leagues';

const FREE_LEAGUES_LINE = BETA_SOCCER_ONLY
  ? 'Browse soccer schedules (Premier League, UCL, La Liga, Serie A, Bundesliga, MLS)'
  : 'Browse games and schedules across eight leagues (six soccer competitions + NFL & NBA)';

export const PLAN_MATRIX = {
  free: [
    FREE_LEAGUES_LINE,
    'Limited model picks per day (daily cap)',
    'Favorites and basic home feed',
    'Includes ads (removed on Premium and Pro)',
    'See upgrade prompts when a feature needs Premium or Pro',
  ],
  premium: [
    'Unlimited predictions & pick history',
    'Full AI explanations and analysis',
    'Pre-game pick refreshes while a match is in progress (not in-play betting odds)',
    'Player prop previews (sample data until licensed feeds)',
    'Ad-free experience',
    '7-day free trial on Premium (Stripe web checkout, then $29.99/mo)',
  ],
  pro: [
    'Everything in Premium (ad-free)',
    'Challenges — multi-game model streaks',
    'Leaderboards & competitive tracking',
    'Best for power users ($9.99/mo via Stripe)',
  ],
} as const;

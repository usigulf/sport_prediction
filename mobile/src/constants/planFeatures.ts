/**
 * Plan capability matrix (product + backend). Used for copy and upgrade routing.
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
    '7-day free trial, then $29.99/mo',
  ],
} as const;

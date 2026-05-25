/**
 * Plan capability matrix (product + backend). Used for copy and upgrade routing.
 *
 * Backend enforces Pro tier on /challenges and /leaderboards.
 */
export const PLAN_MATRIX = {
  free: [
    'Browse games and schedules across eight leagues (six soccer competitions + NFL & NBA)',
    'Limited model picks per day (daily cap)',
    'Favorites and basic home feed',
    'See upgrade prompts when a feature needs Premium or Pro',
  ],
  premium: [
    'Unlimited predictions & pick history',
    'Full AI explanations and analysis',
    'Live win-probability updates during games',
    'Player prop projections',
    '7-day free trial on Premium (via Stripe)',
  ],
  pro: [
    'Everything in Premium',
    'Challenges — multi-game model streaks',
    'Leaderboards & competitive tracking',
    'Best for power users',
  ],
} as const;

/**
 * Human-readable league labels for game cards and filters.
 * Generic category names only — no third-party league trademarks (App Store 4.1a).
 */

export const LEAGUE_DISPLAY_LABELS: Record<string, string> = {
  nfl: 'Pro Football',
  nba: 'Pro Basketball',
  premier_league: 'English Soccer',
  champions_league: 'European Soccer',
  la_liga: 'Spanish Soccer',
  serie_a: 'Italian Soccer',
  bundesliga: 'German Soccer',
  mls: 'US Soccer',
  soccer: 'Soccer',
};

export function formatLeagueLabel(league: string): string {
  const key = (league || '').toLowerCase();
  if (LEAGUE_DISPLAY_LABELS[key]) return LEAGUE_DISPLAY_LABELS[key];
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Sport strip labels on Games (nfl / nba / soccer hub ids). */
export function sportHubLabel(sportId: string): string {
  return LEAGUE_DISPLAY_LABELS[sportId.toLowerCase()] ?? formatLeagueLabel(sportId);
}

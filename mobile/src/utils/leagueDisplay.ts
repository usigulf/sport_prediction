/**
 * Human-readable league labels for game cards and filters.
 */

const LABELS: Record<string, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  mlb: 'MLB',
  nhl: 'NHL',
  premier_league: 'Premier League',
  champions_league: 'Champions League',
  boxing: 'Boxing',
  tennis: 'Tennis',
  golf: 'Golf',
  mma: 'MMA',
};

export function formatLeagueLabel(league: string): string {
  const key = (league || '').toLowerCase();
  if (LABELS[key]) return LABELS[key];
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

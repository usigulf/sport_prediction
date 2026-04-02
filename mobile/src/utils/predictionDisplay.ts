/**
 * Display helpers for prediction UI (no invented stats — only math on API probabilities).
 */

export function formatLeagueLabel(league: string): string {
  if (!league) return '';
  return league
    .replace(/_/g, ' ')
    .toUpperCase()
    .trim();
}

/** Implied third outcome when the model splits mass across three results (e.g. soccer). */
export function impliedDrawProbability(home: number, away: number): number {
  const d = 1 - home - away;
  if (d < 0.005) return 0;
  return Math.min(1, Math.max(0, d));
}

export function normalizeThreeWay(home: number, away: number, draw: number): {
  home: number;
  away: number;
  draw: number;
} {
  const t = home + away + draw;
  if (t <= 0) return { home: 0, away: 0, draw: 0 };
  return { home: home / t, away: away / t, draw: draw / t };
}

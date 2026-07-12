/**
 * Derive pick probabilities for Brier / CLV tracking (POST /user/me/picks).
 * Model-aligned helper remains for tests / suggested defaults — never auto-POST.
 */
import { isSoccerLeague } from '../constants/leagues';
import { impliedDrawForSoccer } from './predictionDisplay';

export type PickOutcome = 'home' | 'away' | 'draw';

export function modelPickFromPrediction(
  homeWinProb: number,
  awayWinProb: number,
  league?: string | null,
): { outcome: PickOutcome; probability: number } {
  const hp = Math.max(0, Math.min(1, homeWinProb));
  const ap = Math.max(0, Math.min(1, awayWinProb));

  if (isSoccerLeague(league)) {
    const dp = impliedDrawForSoccer(hp, ap);
    const entries: [PickOutcome, number][] = [
      ['home', hp],
      ['away', ap],
      ['draw', dp],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    const [outcome, probability] = entries[0];
    return { outcome, probability };
  }

  if (hp >= ap) {
    return { outcome: 'home', probability: hp };
  }
  return { outcome: 'away', probability: ap };
}

/** Probability attached to an explicit user outcome selection. */
export function probabilityForOutcome(
  outcome: PickOutcome,
  homeWinProb: number,
  awayWinProb: number,
  league?: string | null,
): number {
  const hp = Math.max(0.01, Math.min(0.99, homeWinProb));
  const ap = Math.max(0.01, Math.min(0.99, awayWinProb));
  if (outcome === 'home') return hp;
  if (outcome === 'away') return ap;
  const dp = isSoccerLeague(league) ? impliedDrawForSoccer(hp, ap) : 0.33;
  return Math.max(0.01, Math.min(0.99, dp));
}

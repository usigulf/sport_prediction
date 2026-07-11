/**
 * Derive model-aligned pick for Brier / CLV tracking (POST /user/me/picks).
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

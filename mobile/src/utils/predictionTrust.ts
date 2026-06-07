import { isSoccerLeague } from '../constants/leagues';
import type { Prediction } from '../types';

/** True when the model output is demo/synthetic (not trained sklearn on real results). */
export function isDemoModelPrediction(
  prediction: Pick<Prediction, 'model_version' | 'data_quality_label'> | null | undefined,
  _league?: string | null,
): boolean {
  if (!prediction) return false;
  const mv = (prediction.model_version || '').toLowerCase();
  return mv.includes('synthetic') || mv.endsWith('_demo');
}

export function demoModelDisclaimer(league?: string | null): string {
  if (league && isSoccerLeague(league)) {
    return 'Limited data for this competition — informational only, not betting advice.';
  }
  if (league === 'nfl' || league === 'nba') {
    return 'Model trained on synced results — informational only, not betting advice.';
  }
  return 'Informational model output — not betting advice.';
}

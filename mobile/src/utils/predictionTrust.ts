import { isSoccerLeague } from '../constants/leagues';
import type { Prediction } from '../types';

/** True when the model output is demo/synthetic or low-quality non-soccer data. */
export function isDemoModelPrediction(
  prediction: Pick<Prediction, 'model_version' | 'data_quality_label'> | null | undefined,
  league?: string | null,
): boolean {
  if (!prediction) return false;
  const mv = (prediction.model_version || '').toLowerCase();
  if (mv.includes('synthetic') || mv.endsWith('_demo')) return true;
  if (league && !isSoccerLeague(league) && prediction.data_quality_label === 'low') {
    return true;
  }
  return false;
}

export function demoModelDisclaimer(league?: string | null): string {
  if (league && isSoccerLeague(league)) {
    return 'Limited data for this competition — informational only, not betting advice.';
  }
  return 'NFL/NBA picks use demo-style models until full season data is synced.';
}

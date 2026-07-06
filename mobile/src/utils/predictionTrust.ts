import { isSoccerLeague } from '../constants/leagues';
import type { Prediction } from '../types';

export type PredictionSource =
  | 'sklearn'
  | 'heuristic'
  | 'warming'
  | 'synthetic'
  | 'inplay'
  | string;

const LOW_TRUST_SOURCES = new Set(['heuristic', 'warming', 'synthetic']);

/** True when API labels the pick as baseline/heuristic rather than trained sklearn. */
export function isLowTrustPredictionSource(
  source: PredictionSource | null | undefined,
): boolean {
  if (!source) return false;
  return LOW_TRUST_SOURCES.has(String(source).toLowerCase());
}

export function predictionSourceBadgeLabel(
  source: PredictionSource | null | undefined,
): string | null {
  switch ((source || '').toLowerCase()) {
    case 'sklearn':
      return 'ML model';
    case 'heuristic':
      return 'Baseline engine';
    case 'warming':
      return 'Model warming';
    case 'synthetic':
      return 'Limited data';
    case 'inplay':
      return 'In-play adjustment';
    default:
      return null;
  }
}

/** True when the model output is demo/synthetic (not trained sklearn on real results). */
export function isDemoModelPrediction(
  prediction: Pick<
    Prediction,
    'model_version' | 'data_quality_label' | 'prediction_source'
  > | null | undefined,
  _league?: string | null,
): boolean {
  if (!prediction) return false;
  if (isLowTrustPredictionSource(prediction.prediction_source)) return true;
  const mv = (prediction.model_version || '').toLowerCase();
  return mv.includes('synthetic') || mv.endsWith('_demo');
}

export function demoModelDisclaimer(
  league?: string | null,
  predictionSource?: PredictionSource | null,
): string {
  const source = (predictionSource || '').toLowerCase();
  if (source === 'warming') {
    return 'We are still collecting decisive game history before publishing the full ML model. This pick uses our baseline engine — informational only, not betting advice.';
  }
  if (source === 'heuristic') {
    return 'This pick uses our baseline heuristic engine, not the trained ML model — informational only, not betting advice.';
  }
  if (source === 'synthetic') {
    return 'Limited data for this competition — informational only, not betting advice.';
  }
  if (league && isSoccerLeague(league)) {
    return 'Limited data for this competition — informational only, not betting advice.';
  }
  if (league === 'nfl' || league === 'nba') {
    return 'Model trained on synced results — informational only, not betting advice.';
  }
  return 'Informational model output — not betting advice.';
}

/** Hide detailed pick strength UI for baseline/warming picks in production-facing cards. */
export function shouldBlockHeuristicPickUi(
  prediction: Pick<Prediction, 'model_version' | 'prediction_source'> | null | undefined,
): boolean {
  if (!prediction) return false;
  return isLowTrustPredictionSource(prediction.prediction_source) || isDemoModelPrediction(prediction);
}

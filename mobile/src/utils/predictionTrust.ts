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

/** True when the API (or client heuristics) say probabilities must not be shown. */
export function shouldSuppressPredictionProbabilities(
  prediction: Pick<
    Prediction,
    | 'home_win_probability'
    | 'away_win_probability'
    | 'prediction_source'
    | 'model_version'
    | 'quality_gate_applied'
    | 'probabilities_suppressed'
  > | null | undefined,
): boolean {
  if (!prediction) return true;
  if (prediction.probabilities_suppressed) return true;
  if (prediction.quality_gate_applied && isLowTrustPredictionSource(prediction.prediction_source)) {
    return true;
  }
  if (
    prediction.home_win_probability == null ||
    prediction.away_win_probability == null ||
    Number.isNaN(Number(prediction.home_win_probability)) ||
    Number.isNaN(Number(prediction.away_win_probability))
  ) {
    return true;
  }
  return shouldBlockHeuristicPickUi(prediction);
}

export function lowTrustSuppressionCopy(
  predictionSource?: PredictionSource | null,
): string {
  const source = (predictionSource || '').toLowerCase();
  if (source === 'warming') {
    return 'Model still warming — probabilities are hidden until the trained model is publish-ready for this competition.';
  }
  if (source === 'synthetic') {
    return 'Limited data for this competition — probabilities are hidden until real standings features are available.';
  }
  if (source === 'heuristic') {
    return 'Baseline engine only — probabilities are hidden so heuristic picks are not shown as ML forecasts.';
  }
  return 'Probabilities are temporarily hidden because this pick does not meet our trust bar.';
}

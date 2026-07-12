import {
  isLowTrustPredictionSource,
  lowTrustSuppressionCopy,
  shouldSuppressPredictionProbabilities,
} from './predictionTrust';

describe('predictionTrust suppression', () => {
  it('treats heuristic/warming/synthetic as low trust', () => {
    expect(isLowTrustPredictionSource('heuristic')).toBe(true);
    expect(isLowTrustPredictionSource('warming')).toBe(true);
    expect(isLowTrustPredictionSource('synthetic')).toBe(true);
    expect(isLowTrustPredictionSource('sklearn')).toBe(false);
  });

  it('suppresses when API flags probabilities_suppressed', () => {
    expect(
      shouldSuppressPredictionProbabilities({
        home_win_probability: 0.6,
        away_win_probability: 0.4,
        prediction_source: 'sklearn',
        model_version: 'sklearn_soccer_1x2',
        probabilities_suppressed: true,
      }),
    ).toBe(true);
  });

  it('suppresses when probabilities are null', () => {
    expect(
      shouldSuppressPredictionProbabilities({
        home_win_probability: null,
        away_win_probability: null,
        prediction_source: 'heuristic',
        model_version: 'heuristic_v2',
      }),
    ).toBe(true);
  });

  it('allows sklearn picks with numeric probabilities', () => {
    expect(
      shouldSuppressPredictionProbabilities({
        home_win_probability: 0.55,
        away_win_probability: 0.45,
        prediction_source: 'sklearn',
        model_version: 'sklearn_soccer_1x2',
        probabilities_suppressed: false,
      }),
    ).toBe(false);
  });

  it('returns honest suppression copy', () => {
    expect(lowTrustSuppressionCopy('heuristic')).toMatch(/Baseline engine/i);
    expect(lowTrustSuppressionCopy('warming')).toMatch(/warming/i);
  });
});

import { modelPickFromPrediction } from './userPickTracking';

describe('modelPickFromPrediction', () => {
  it('picks home or away for two-outcome sports', () => {
    expect(modelPickFromPrediction(0.62, 0.38, 'nfl')).toEqual({
      outcome: 'home',
      probability: 0.62,
    });
    expect(modelPickFromPrediction(0.41, 0.59, 'nba')).toEqual({
      outcome: 'away',
      probability: 0.59,
    });
  });

  it('includes draw for soccer when it is the max leg', () => {
    const pick = modelPickFromPrediction(0.2, 0.2, 'premier_league');
    expect(pick.outcome).toBe('draw');
    expect(pick.probability).toBeCloseTo(0.6, 5);
  });
});

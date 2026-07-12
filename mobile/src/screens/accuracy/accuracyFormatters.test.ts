import {
  accuracyBlockTotals,
  humanizeCheckName,
} from './accuracyFormatters';

describe('accuracyFormatters', () => {
  it('totals prefer total_games alias', () => {
    expect(accuracyBlockTotals({ total_games: 10, correct: 6, accuracy_pct: 60 })).toEqual({
      total: 10,
      correct: 6,
      pct: 60,
    });
  });

  it('humanizes acceptance check names', () => {
    expect(humanizeCheckName('beats_naive_baseline')).toBe('Beats Naive Baseline');
  });
});

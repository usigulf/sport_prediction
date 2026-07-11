import {
  gameDetailQueryKey,
  gameExplanationQueryKey,
  gamePredictionQueryKey,
  subscriptionTierQueryKey,
} from '../query/serverQueryKeys';

describe('serverQueryKeys', () => {
  it('builds stable game detail keys', () => {
    expect(gameDetailQueryKey('game-1')).toEqual(['gameDetail', 'game-1']);
    expect(gamePredictionQueryKey('game-1')).toEqual(['gamePrediction', 'game-1']);
    expect(gameExplanationQueryKey('game-1', 'pred-1', 'refresh')).toEqual([
      'gameExplanation',
      'game-1',
      'pred-1',
      'refresh',
    ]);
  });

  it('builds subscription tier keys per user', () => {
    expect(subscriptionTierQueryKey('user-1')).toEqual(['subscriptionTier', 'user-1']);
    expect(subscriptionTierQueryKey(null)).toEqual(['subscriptionTier', 'guest']);
  });
});

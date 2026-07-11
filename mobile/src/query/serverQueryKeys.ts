export function gameDetailQueryKey(gameId: string) {
  return ['gameDetail', gameId] as const;
}

export function gamePredictionQueryKey(gameId: string) {
  return ['gamePrediction', gameId] as const;
}

export function gameExplanationQueryKey(
  gameId: string,
  predictionId?: string,
  refreshToken?: string | null,
) {
  return ['gameExplanation', gameId, predictionId ?? null, refreshToken ?? null] as const;
}

export function subscriptionTierQueryKey(userId?: string | null) {
  return ['subscriptionTier', userId ?? 'guest'] as const;
}

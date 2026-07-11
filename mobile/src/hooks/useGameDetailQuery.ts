import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { Game, Prediction, PredictionExplanation } from '../types';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import {
  gameDetailQueryKey,
  gameExplanationQueryKey,
  gamePredictionQueryKey,
} from '../query/serverQueryKeys';

export {
  gameDetailQueryKey,
  gameExplanationQueryKey,
  gamePredictionQueryKey,
} from '../query/serverQueryKeys';

export function useGameDetailQuery(gameId: string) {
  return useQuery({
    queryKey: gameDetailQueryKey(gameId),
    queryFn: async () => {
      const game = await apiService.getGame(gameId);
      return game as Game;
    },
    enabled: Boolean(gameId),
  });
}

export function useGamePredictionQuery(gameId: string, enabled: boolean) {
  return useQuery({
    queryKey: gamePredictionQueryKey(gameId),
    queryFn: async () => {
      try {
        const prediction = await apiService.getPrediction(gameId);
        return prediction as Prediction;
      } catch (e) {
        throw new Error(getUserFriendlyMessage(e));
      }
    },
    enabled: enabled && Boolean(gameId),
    retry: false,
  });
}

export function useGameExplanationQuery(
  gameId: string,
  predictionId: string | undefined,
  enabled: boolean,
  refreshToken?: string | null,
) {
  return useQuery({
    queryKey: gameExplanationQueryKey(gameId, predictionId, refreshToken),
    queryFn: async () => {
      const explanation = await apiService.getPredictionExplanation(gameId);
      return explanation as PredictionExplanation;
    },
    enabled: enabled && Boolean(gameId) && Boolean(predictionId),
  });
}

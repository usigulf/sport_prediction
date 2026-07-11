import { useCallback, useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useQueryClient } from '@tanstack/react-query';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { apiService, type MarketOddsResponse, type LineMovementResponse } from '../services/api';
import { useLiveUpdates } from './useLiveUpdates';
import { useServerFeatureFlags } from './useServerFeatureFlags';
import { isOddsDisplayEnabled, isPlayerPropsEnabled } from '../utils/resolvedFeatureFlags';
import { useFavoriteMutations, useFavoriteTeamIds } from './useFavorites';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { hasPremiumAccess } from '../utils/subscription';
import { useRewardedUnlock } from '../ads/engine/RewardedUnlockContext';
import { useAdEngine } from '../ads/engine/AdEngineContext';
import { trackSharePick } from '../services/productAnalytics';
import { modelPickFromPrediction } from '../utils/userPickTracking';
import {
  gameDetailQueryKey,
  gamePredictionQueryKey,
  useGameDetailQuery,
  useGamePredictionQuery,
} from './useGameDetailQuery';
import { useSubscriptionTier } from './useSubscriptionTier';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { PlayerPropItem } from '../screens/gameDetail/types';

type Nav = StackNavigationProp<RootStackParamList>;

export function useGameDetailData(gameId: string, navigation: Nav) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const authUser = useAppSelector((s) => s.auth.user);

  const gameQuery = useGameDetailQuery(gameId);
  const predictionQuery = useGamePredictionQuery(gameId, isAuthenticated);
  const { subscriptionTier } = useSubscriptionTier();

  const currentGame = gameQuery.data ?? null;
  const currentPrediction = predictionQuery.data ?? null;
  const loading = gameQuery.isLoading && !currentGame;
  const loadingPrediction = predictionQuery.isLoading;
  const gamesError =
    (predictionQuery.error instanceof Error ? predictionQuery.error.message : null) ??
    (gameQuery.error instanceof Error ? gameQuery.error.message : null);

  const adEngine = useAdEngine();
  const rewardedUnlock = useRewardedUnlock();
  const serverFlags = useServerFeatureFlags();
  const oddsDisplayEnabled = isOddsDisplayEnabled(serverFlags);
  const playerPropsEnabled = isPlayerPropsEnabled(serverFlags);
  const favoriteTeamIds = useFavoriteTeamIds();
  const { addTeam } = useFavoriteMutations();

  const [refreshing, setRefreshing] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [addingTeamId, setAddingTeamId] = useState<string | null>(null);
  const [playerProps, setPlayerProps] = useState<PlayerPropItem[]>([]);
  const [playerPropsLoading, setPlayerPropsLoading] = useState(false);
  const [playerPropsError, setPlayerPropsError] = useState<string | null>(null);
  const [playerPropsDisclaimer, setPlayerPropsDisclaimer] = useState<string | null>(null);
  const [playerPropsNamed, setPlayerPropsNamed] = useState(false);
  const [marketOdds, setMarketOdds] = useState<MarketOddsResponse | null>(null);
  const [lineMovement, setLineMovement] = useState<LineMovementResponse | null>(null);

  const isPremium = hasPremiumAccess(subscriptionTier);
  const unlockedByAd = rewardedUnlock.isUnlockedForGame(gameId);
  const advancedLockedFree = !isPremium && !unlockedByAd;
  const { lastUpdate, connected, error: liveError } = useLiveUpdates(gameId, {
    enabled: isPremium,
  });

  useEffect(() => {
    setShowExplanation(false);
  }, [gameId]);

  useEffect(() => {
    if (!playerPropsEnabled || !hasPremiumAccess(subscriptionTier)) return;
    let cancelled = false;
    setPlayerPropsError(null);
    setPlayerPropsLoading(true);
    void apiService
      .getGamePlayerProps(gameId)
      .then((res) => {
        if (cancelled) return;
        const body = res as {
          props?: PlayerPropItem[];
          disclaimer?: string;
          has_named_players?: boolean;
        };
        setPlayerProps(body.props ?? []);
        setPlayerPropsDisclaimer(body.disclaimer ?? null);
        setPlayerPropsNamed(Boolean(body.has_named_players));
      })
      .catch((e: unknown) => {
        if (!cancelled) setPlayerPropsError(getUserFriendlyMessage(e));
      })
      .finally(() => {
        if (!cancelled) setPlayerPropsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, subscriptionTier, playerPropsEnabled]);

  useEffect(() => {
    if (!oddsDisplayEnabled) {
      setMarketOdds(null);
      setLineMovement(null);
      return;
    }
    let cancelled = false;
    void apiService
      .getMarketOdds(gameId)
      .then((res) => {
        if (!cancelled) setMarketOdds(res);
      })
      .catch(() => {
        if (!cancelled) setMarketOdds(null);
      });
    void apiService
      .getLineMovement(gameId)
      .then((res) => {
        if (!cancelled) setLineMovement(res);
      })
      .catch(() => {
        if (!cancelled) setLineMovement(null);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, oddsDisplayEnabled]);

  useEffect(() => {
    if (!isAuthenticated || !currentPrediction || !currentGame) return;
    const status = currentGame.status;
    if (status === 'finished' || status === 'final') return;

    const hp = Number(currentPrediction.home_win_probability);
    const ap = Number(currentPrediction.away_win_probability);
    if (!Number.isFinite(hp) || !Number.isFinite(ap)) return;

    const { outcome, probability } = modelPickFromPrediction(hp, ap, currentGame.league);
    void apiService
      .recordUserPick({
        game_id: gameId,
        outcome,
        probability,
        market_home_implied_prob: marketOdds?.consensus?.home_implied_prob ?? null,
        market_away_implied_prob: marketOdds?.consensus?.away_implied_prob ?? null,
      })
      .catch(() => {
        /* non-blocking */
      });
  }, [
    currentGame,
    currentPrediction,
    gameId,
    isAuthenticated,
    marketOdds?.consensus?.away_implied_prob,
    marketOdds?.consensus?.home_implied_prob,
    marketOdds?.fetched_at_iso,
  ]);

  useEffect(() => {
    if (!isPremium || !lastUpdate?.prediction_updated_at) return;
    void queryClient.invalidateQueries({ queryKey: gameDetailQueryKey(gameId) });
    void queryClient.invalidateQueries({ queryKey: gamePredictionQueryKey(gameId) });
  }, [lastUpdate?.prediction_updated_at, gameId, isPremium, queryClient]);

  const onRefresh = useCallback(async () => {
    await rewardedUnlock.invalidateForGame(gameId);
    void adEngine.bumpPredictionEngagement();
    setRefreshing(true);
    try {
      await Promise.all([
        gameQuery.refetch(),
        isAuthenticated ? predictionQuery.refetch() : Promise.resolve(),
      ]);
      if (oddsDisplayEnabled) {
        try {
          setMarketOdds(await apiService.getMarketOdds(gameId));
        } catch {
          setMarketOdds(null);
        }
        try {
          setLineMovement(await apiService.getLineMovement(gameId));
        } catch {
          setLineMovement(null);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [
    adEngine,
    gameId,
    gameQuery,
    isAuthenticated,
    oddsDisplayEnabled,
    predictionQuery,
    rewardedUnlock,
  ]);

  const addTeamToFavorites = useCallback(
    async (teamId: string) => {
      if (favoriteTeamIds.has(teamId) || addingTeamId) return;
      setAddingTeamId(teamId);
      try {
        await addTeam.mutateAsync(teamId);
      } catch (e) {
        Alert.alert('Could not add favorite', getUserFriendlyMessage(e));
      } finally {
        setAddingTeamId(null);
      }
    },
    [addTeam, addingTeamId, favoriteTeamIds],
  );

  const handleShare = useCallback(async () => {
    try {
      void trackSharePick(gameId);
      const res = await apiService.sharePick(gameId);
      const shareMessage = [res.message, res.deep_link].filter(Boolean).join('\n\n');
      if (res.image_base64 && (await Sharing.isAvailableAsync())) {
        const uri = `${FileSystem.cacheDirectory}octobetiq-share-${gameId}.png`;
        await FileSystem.writeAsStringAsync(uri, res.image_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share octobetiQ pick',
        });
      } else {
        await Share.share({
          message: shareMessage,
          title: 'octobetiQ pick',
          url: res.share_url ?? undefined,
        });
      }
    } catch (e) {
      Alert.alert('Share', getUserFriendlyMessage(e));
    }
  }, [gameId]);

  return {
    authUser,
    isAuthenticated,
    currentGame,
    currentPrediction,
    loading,
    loadingPrediction,
    gamesError,
    refreshing,
    onRefresh,
    showExplanation,
    setShowExplanation,
    favoriteTeamIds,
    addingTeamId,
    addTeamToFavorites,
    subscriptionTier,
    isPremium,
    advancedLockedFree,
    playerProps,
    playerPropsLoading,
    playerPropsError,
    playerPropsDisclaimer,
    playerPropsNamed,
    playerPropsEnabled,
    marketOdds,
    lineMovement,
    oddsDisplayEnabled,
    lastUpdate,
    connected,
    liveError,
    handleShare,
    navigation,
  };
}

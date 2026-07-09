import { useCallback, useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchGameDetails,
  fetchPrediction,
  fetchExplanation,
  clearPredictionForGameChange,
} from '../store/slices/gamesSlice';
import { apiService, type MarketOddsResponse } from '../services/api';
import { useLiveUpdates } from './useLiveUpdates';
import { useServerFeatureFlags } from './useServerFeatureFlags';
import { isOddsDisplayEnabled, isPlayerPropsEnabled } from '../utils/resolvedFeatureFlags';
import { useFavoriteMutations, useFavoriteTeamIds } from './useFavorites';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { hasPremiumAccess } from '../utils/subscription';
import { useRewardedUnlock } from '../ads/engine/RewardedUnlockContext';
import { useAdEngine } from '../ads/engine/AdEngineContext';
import { trackSharePick } from '../services/productAnalytics';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { PlayerPropItem } from '../screens/gameDetail/types';

type Nav = StackNavigationProp<RootStackParamList>;

export function useGameDetailData(gameId: string, navigation: Nav) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const authUser = useAppSelector((s) => s.auth.user);
  const { currentGame, currentPrediction, loading, loadingPrediction, error: gamesError } =
    useAppSelector((s) => s.games);

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
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [playerProps, setPlayerProps] = useState<PlayerPropItem[]>([]);
  const [playerPropsLoading, setPlayerPropsLoading] = useState(false);
  const [playerPropsError, setPlayerPropsError] = useState<string | null>(null);
  const [playerPropsDisclaimer, setPlayerPropsDisclaimer] = useState<string | null>(null);
  const [playerPropsNamed, setPlayerPropsNamed] = useState(false);
  const [marketOdds, setMarketOdds] = useState<MarketOddsResponse | null>(null);

  const isPremium = hasPremiumAccess(subscriptionTier);
  const unlockedByAd = rewardedUnlock.isUnlockedForGame(gameId);
  const advancedLockedFree = !isPremium && !unlockedByAd;
  const { lastUpdate, connected, error: liveError } = useLiveUpdates(gameId, {
    enabled: isPremium,
  });

  const loadGameData = useCallback(async () => {
    const tasks: Promise<unknown>[] = [dispatch(fetchGameDetails(gameId))];
    if (isAuthenticated) tasks.push(dispatch(fetchPrediction(gameId)));
    await Promise.all(tasks);
  }, [dispatch, gameId, isAuthenticated]);

  useEffect(() => {
    setShowExplanation(false);
    dispatch(clearPredictionForGameChange());
    void loadGameData();
  }, [gameId, isAuthenticated, dispatch, loadGameData]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptionTier('free');
      return;
    }
    let cancelled = false;
    void apiService
      .getCurrentUser()
      .then((user) => {
        if (!cancelled && (user as { subscription_tier?: string })?.subscription_tier) {
          setSubscriptionTier((user as { subscription_tier: string }).subscription_tier);
        }
      })
      .catch(() => {
        if (!cancelled) setSubscriptionTier('free');
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

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
    return () => {
      cancelled = true;
    };
  }, [gameId, oddsDisplayEnabled]);

  useEffect(() => {
    if (!isPremium || !lastUpdate?.prediction_updated_at) return;
    dispatch(fetchGameDetails(gameId));
    dispatch(fetchPrediction(gameId));
  }, [lastUpdate?.prediction_updated_at, gameId, isPremium, dispatch]);

  const onRefresh = useCallback(async () => {
    await rewardedUnlock.invalidateForGame(gameId);
    void adEngine.bumpPredictionEngagement();
    setRefreshing(true);
    try {
      await loadGameData();
      if (oddsDisplayEnabled) {
        try {
          setMarketOdds(await apiService.getMarketOdds(gameId));
        } catch {
          setMarketOdds(null);
        }
      }
      if (showExplanation && currentPrediction?.id && isPremium) {
        await dispatch(
          fetchExplanation({ gameId, predictionId: currentPrediction.id }),
        ).unwrap();
      }
    } finally {
      setRefreshing(false);
    }
  }, [
    adEngine,
    currentPrediction?.id,
    dispatch,
    gameId,
    isPremium,
    loadGameData,
    oddsDisplayEnabled,
    rewardedUnlock,
    showExplanation,
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
    oddsDisplayEnabled,
    lastUpdate,
    connected,
    liveError,
    handleShare,
    navigation,
  };
}

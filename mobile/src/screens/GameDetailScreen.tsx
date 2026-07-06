import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PredictionCard } from '../components/PredictionCard';
import { MarketOddsCard } from '../components/MarketOddsCard';
import { ExplanationView } from '../components/ExplanationView';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchGameDetails,
  fetchPrediction,
  fetchExplanation,
  clearPredictionForGameChange,
} from '../store/slices/gamesSlice';
import { apiService } from '../services/api';
import type { MarketOddsResponse } from '../services/api';
import { Game } from '../types';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useLiveUpdates } from '../hooks/useLiveUpdates';
import { theme } from '../constants/theme';
import { PLAYER_PROPS_ENABLED, ODDS_DISPLAY_ENABLED } from '../constants/featureFlags';
import { PREMIUM_PROPS_UNLOCK_CONTEXT } from '../constants/premiumCopy';
import { GuestSignupCard } from '../components/GuestSignupCard';
import { formatLeagueLabel } from '../utils/predictionDisplay';
import { hasPremiumAccess } from '../utils/subscription';
import { teamLogoUriCandidates } from '../utils/teamLogoUrl';
import { TeamCrestImage } from '../components/TeamCrestImage';
import { useRewardedUnlock } from '../ads/engine/RewardedUnlockContext';
import { RewardedUnlockCTA } from '../ads/components/RewardedUnlockCTA';
import { NativeFeedAdCard } from '../ads/components/NativeFeedAdCard';
import { BannerStrip } from '../ads/components/BannerStrip';
import { HousePromotionCard } from '../ads/components/HousePromotionCard';
import { useGameExitInterstitial } from '../ads/hooks/useGameExitInterstitial';
import { useAdEngine } from '../ads/engine/AdEngineContext';
import { trackSharePick } from '../services/productAnalytics';
import { SharePickCard, buildSharePickCardData } from '../components/SharePickCard';

interface FavoritesResponse {
  teams?: { id: string; name: string }[];
  leagues?: { id: string; name: string }[];
}

export interface PlayerPropItem {
  player_name: string;
  team: string;
  prop_type: string;
  predicted_value: number;
  line: number;
  unit: string;
  confidence_level?: string;
  source?: 'spotlight' | 'team_estimate';
}

export const GameDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const adEngine = useAdEngine();
  const rewardedUnlock = useRewardedUnlock();
  const insets = useSafeAreaInsets();

  useGameExitInterstitial(navigation);
  const dispatch = useAppDispatch();
  const { gameId } = route.params as { gameId: string };
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const authUser = useAppSelector((state) => state.auth.user);

  const { currentGame, currentPrediction, loading, loadingPrediction, error: gamesError } =
    useAppSelector((state) => state.games);

  const [refreshing, setRefreshing] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<Set<string>>(new Set());
  const [addingTeamId, setAddingTeamId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [playerProps, setPlayerProps] = useState<PlayerPropItem[]>([]);
  const [playerPropsLoading, setPlayerPropsLoading] = useState(false);
  const [playerPropsError, setPlayerPropsError] = useState<string | null>(null);
  const [playerPropsDisclaimer, setPlayerPropsDisclaimer] = useState<string | null>(null);
  const [playerPropsNamed, setPlayerPropsNamed] = useState(false);
  const [marketOdds, setMarketOdds] = useState<MarketOddsResponse | null>(null);

  const isPremium = hasPremiumAccess(subscriptionTier);
  const unlockedByAd = rewardedUnlock.isUnlockedForGame(gameId);
  const advancedLockedFree = !isPremium && !unlockedByAd;
  const { lastUpdate, connected, error: liveError } = useLiveUpdates(gameId, { enabled: isPremium });

  useEffect(() => {
    setShowExplanation(false);
    dispatch(clearPredictionForGameChange());
    loadGameData();
  }, [gameId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteTeamIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const favs = (await apiService.getFavorites()) as FavoritesResponse;
        if (!cancelled && favs?.teams) {
          setFavoriteTeamIds(new Set(favs.teams.map((t) => t.id)));
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptionTier('free');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const user = await apiService.getCurrentUser() as { subscription_tier?: string };
        if (!cancelled && user?.subscription_tier) {
          setSubscriptionTier(user.subscription_tier);
        }
      } catch (_) {
        if (!cancelled) setSubscriptionTier('free');
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!PLAYER_PROPS_ENABLED || !hasPremiumAccess(subscriptionTier)) return;
    let cancelled = false;
    setPlayerPropsError(null);
    setPlayerPropsLoading(true);
    (async () => {
      try {
        const res = await apiService.getGamePlayerProps(gameId) as {
          props?: PlayerPropItem[];
          disclaimer?: string;
          has_named_players?: boolean;
        };
        if (!cancelled) {
          setPlayerProps(res?.props ?? []);
          setPlayerPropsDisclaimer(res?.disclaimer ?? null);
          setPlayerPropsNamed(Boolean(res?.has_named_players));
        }
      } catch (e: any) {
        if (!cancelled) setPlayerPropsError(getUserFriendlyMessage(e));
      } finally {
        if (!cancelled) setPlayerPropsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, subscriptionTier]);

  useEffect(() => {
    if (!ODDS_DISPLAY_ENABLED) {
      setMarketOdds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getMarketOdds(gameId);
        if (!cancelled) setMarketOdds(res);
      } catch {
        if (!cancelled) setMarketOdds(null);
      }
    })();
    return () => { cancelled = true; };
  }, [gameId]);

  /** When the server writes a new prediction (WS signals), refresh game + prediction so analysis text matches. */
  useEffect(() => {
    if (!isPremium || !lastUpdate?.prediction_updated_at) return;
    dispatch(fetchGameDetails(gameId));
    dispatch(fetchPrediction(gameId));
  }, [lastUpdate?.prediction_updated_at, gameId, isPremium, dispatch]);

  const loadGameData = async () => {
    try {
      const tasks: Promise<unknown>[] = [dispatch(fetchGameDetails(gameId))];
      if (isAuthenticated) {
        tasks.push(dispatch(fetchPrediction(gameId)));
      }
      await Promise.all(tasks);
    } catch (error) {
      console.error('Error loading game data:', error);
    }
  };

  const onRefresh = async () => {
    await rewardedUnlock.invalidateForGame(gameId);
    void adEngine.bumpPredictionEngagement();
    setRefreshing(true);
    try {
      await loadGameData();
      if (ODDS_DISPLAY_ENABLED) {
        try {
          const res = await apiService.getMarketOdds(gameId);
          setMarketOdds(res);
        } catch {
          setMarketOdds(null);
        }
      }
      if (showExplanation && currentPrediction?.id && isPremium) {
        await dispatch(
          fetchExplanation({ gameId, predictionId: currentPrediction.id })
        ).unwrap();
      }
    } catch {
      // loadGameData / explanation errors are surfaced via Redux or existing UI
    } finally {
      setRefreshing(false);
    }
  };

  const addTeamToFavorites = async (teamId: string) => {
    if (favoriteTeamIds.has(teamId) || addingTeamId) return;
    setAddingTeamId(teamId);
    try {
      await apiService.addFavoriteTeam(teamId);
      setFavoriteTeamIds((prev) => new Set(prev).add(teamId));
    } catch (e) {
      Alert.alert('Could not add favorite', getUserFriendlyMessage(e));
    } finally {
      setAddingTeamId(null);
    }
  };

  const handleShare = async () => {
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
  };

  if (loading && !currentGame) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Loading game details...</Text>
      </View>
    );
  }

  if (!currentGame) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  const homeName = currentGame.home_team?.name ?? 'Home';
  const awayName = currentGame.away_team?.name ?? 'Away';
  const homeCrestCandidates = teamLogoUriCandidates(currentGame.home_team, currentGame.league);
  const awayCrestCandidates = teamLogoUriCandidates(currentGame.away_team, currentGame.league);
  const statusUpper = currentGame.status.toUpperCase();

  return (
    <View style={styles.screenRoot}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 72 + insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Game Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.league}>{formatLeagueLabel(currentGame.league)}</Text>
          <Text style={styles.matchTitle} numberOfLines={2}>
            {homeName} vs {awayName}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            currentGame.status === 'live' && styles.statusBadgeLive,
            currentGame.status === 'finished' && styles.statusBadgeFinished,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              currentGame.status === 'live' && styles.statusBadgeTextLive,
              currentGame.status === 'finished' && styles.statusBadgeTextFinished,
            ]}
          >
            {statusUpper}
          </Text>
        </View>
      </View>

      {/* Teams / participants — horizontal matchup */}
      <View style={styles.teamsSection}>
        <View style={styles.teamColumn}>
          <Text style={styles.teamRole}>Home</Text>
          <TeamCrestImage
            candidates={homeCrestCandidates}
            fallbackLabel={homeName}
            style={styles.teamLogo}
            contentFit="contain"
          />
          <Text style={styles.teamName} numberOfLines={2}>
            {homeName}
          </Text>
          {currentGame.status === 'live' && (
            <Text style={styles.score}>{currentGame.home_score}</Text>
          )}
          {currentGame.home_team?.id && (
            <TouchableOpacity
              style={[
                styles.favButtonGreen,
                (favoriteTeamIds.has(currentGame.home_team.id) || addingTeamId === currentGame.home_team.id) &&
                  styles.favButtonGreenDisabled,
              ]}
              onPress={() => addTeamToFavorites(currentGame.home_team!.id)}
              disabled={favoriteTeamIds.has(currentGame.home_team.id) || !!addingTeamId}
            >
              <Text style={styles.favButtonGreenText}>
                {favoriteTeamIds.has(currentGame.home_team.id)
                  ? '✓ In favorites'
                  : addingTeamId === currentGame.home_team.id
                    ? 'Adding…'
                    : '⭐ Add to favorites'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.vsDivider}>
          <Text style={styles.vs}>VS</Text>
        </View>

        <View style={styles.teamColumn}>
          <Text style={styles.teamRole}>Away</Text>
          <TeamCrestImage
            candidates={awayCrestCandidates}
            fallbackLabel={awayName}
            style={styles.teamLogo}
            contentFit="contain"
          />
          <Text style={styles.teamName} numberOfLines={2}>
            {awayName}
          </Text>
          {currentGame.status === 'live' && (
            <Text style={styles.score}>{currentGame.away_score}</Text>
          )}
          {currentGame.away_team?.id && (
            <TouchableOpacity
              style={[
                styles.favButtonGreen,
                (favoriteTeamIds.has(currentGame.away_team.id) || addingTeamId === currentGame.away_team.id) &&
                  styles.favButtonGreenDisabled,
              ]}
              onPress={() => addTeamToFavorites(currentGame.away_team!.id)}
              disabled={favoriteTeamIds.has(currentGame.away_team.id) || !!addingTeamId}
            >
              <Text style={styles.favButtonGreenText}>
                {favoriteTeamIds.has(currentGame.away_team.id)
                  ? '✓ In favorites'
                  : addingTeamId === currentGame.away_team.id
                    ? 'Adding…'
                    : '⭐ Add to favorites'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Prediction — tap expands rich analysis */}
      <View style={styles.predictionSection}>
        {loadingPrediction ? (
          <View style={styles.predictionPlaceholder}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.mutedText}>Loading prediction...</Text>
          </View>
        ) : currentPrediction ? (
          <>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowExplanation(!showExplanation)}
              style={styles.predictionTapArea}
            >
              <PredictionCard
                prediction={currentPrediction}
                embedded
                league={currentGame.league}
                homeTeamName={homeName}
                awayTeamName={awayName}
                advancedInsightsLocked={advancedLockedFree}
              />
              <View style={styles.whyButton}>
                <Text style={styles.whyButtonText}>
                  {showExplanation ? 'Hide analysis' : 'Show analysis'}
                </Text>
                <Text style={styles.whyButtonSubtext}>
                  Live context, standings, H2H, metrics & scenarios
                </Text>
              </View>
            </TouchableOpacity>
            <SharePickCard
              card={buildSharePickCardData({
                homeName,
                awayName,
                league: currentGame.league,
                prediction: currentPrediction,
                userId: authUser?.id,
                pickDetailsLocked: advancedLockedFree,
              })}
              pickDetailsLocked={advancedLockedFree}
            />
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share this pick</Text>
            </TouchableOpacity>
            {ODDS_DISPLAY_ENABLED && marketOdds?.available ? (
              <MarketOddsCard
                homeTeamName={homeName}
                awayTeamName={awayName}
                payload={marketOdds}
              />
            ) : null}
            <NativeFeedAdCard surface="game_detail" screenLabel="GameDetailNative" />
            {showExplanation && advancedLockedFree ? (
              <RewardedUnlockCTA
                gameId={gameId}
                onUnlock={() => {
                  /* state from context; optional local refresh */
                }}
                onSubscribePress={() =>
                  navigation.navigate('Paywall', {
                    emphasizeTier: 'premium',
                    contextMessage:
                      'Premium unlocks full analysis without ads. Rewarded unlock is optional.',
                  })
                }
              />
            ) : null}
            {showExplanation && !advancedLockedFree ? (
              <ExplanationView
                gameId={gameId}
                predictionId={currentPrediction.id}
                homeTeamName={homeName}
                awayTeamName={awayName}
                analysisAsOf={currentPrediction.created_at}
                analysisRefreshToken={
                  isPremium ? lastUpdate?.prediction_updated_at ?? null : null
                }
                league={currentGame.league}
                homeWinProbability={currentPrediction.home_win_probability}
                awayWinProbability={currentPrediction.away_win_probability}
              />
            ) : null}
          </>
        ) : !isAuthenticated ? (
          <GuestSignupCard
            title="Sign up to see this pick"
            message="Create a free account to view win probabilities, full analysis, favorites, and live updates for every game."
          />
        ) : (
          <View style={styles.predictionPlaceholder}>
            {gamesError && /daily prediction limit/i.test(gamesError) ? (
              <>
                <Text style={styles.mutedText}>{getUserFriendlyMessage(gamesError)}</Text>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() =>
                    navigation.navigate('Paywall', {
                      emphasizeTier: 'premium',
                      contextMessage: 'Premium unlocks unlimited daily predictions.',
                    })
                  }
                >
                  <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.mutedText}>
                {isPremium
                  ? 'Full analysis will be available closer to game time.'
                  : gamesError
                    ? getUserFriendlyMessage(gamesError)
                    : 'No prediction available for this game.'}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Live updates (WebSocket, premium) */}
      {isPremium && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>
            {lastUpdate?.is_in_play || currentGame?.status === 'live'
              ? 'In-play updates'
              : 'Live updates'}
          </Text>
          <Text style={styles.mutedText}>
            {lastUpdate?.is_in_play
              ? 'Win probability adjusts with the score — informational only, not betting odds.'
              : 'Connects when the match is on; probabilities refresh as the model updates.'}
          </Text>
          {liveError ? (
            <Text style={styles.playerPropsError}>{liveError}</Text>
          ) : (
            <>
              <Text style={styles.mutedText}>
                {connected ? '● Connected' : '○ Connecting…'}
              </Text>
              {lastUpdate && (
                <View style={styles.liveUpdateRow}>
                  <Text style={styles.liveScore}>
                    {lastUpdate.home_score} – {lastUpdate.away_score}
                  </Text>
                  <Text style={styles.liveProbs}>
                    Win prob: {Math.round(lastUpdate.home_win_probability * 100)}% / {Math.round(lastUpdate.away_win_probability * 100)}%
                    {lastUpdate.confidence_level ? ` · ${lastUpdate.confidence_level}` : ''}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Player Props (hidden until licensed data — see featureFlags) */}
      {PLAYER_PROPS_ENABLED ? (
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>
          {playerPropsNamed ? 'Player props' : 'Player props (model est.)'}
        </Text>
        {isPremium ? (
          <>
            <Text style={styles.mutedText}>
              {playerPropsDisclaimer ??
                'Model projections from team scores and spotlight players — not sportsbook lines.'}
            </Text>
            {playerPropsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.accent} style={styles.playerPropsLoader} />
            ) : playerPropsError ? (
              <Text style={styles.playerPropsError}>{playerPropsError}</Text>
            ) : playerProps.length === 0 ? (
              <Text style={styles.mutedText}>No player props for this game yet.</Text>
            ) : (
              playerProps.map((prop, i) => (
                <View key={i} style={styles.propRow}>
                  <Text style={styles.propPlayer}>{prop.player_name}</Text>
                  <Text style={styles.propMeta}>
                    {prop.prop_type} — model line {prop.line} {prop.unit}
                    {prop.confidence_level ? ` · ${prop.confidence_level}` : ''}
                  </Text>
                  <Text style={styles.propPredicted}>
                    Projected: {prop.predicted_value} {prop.unit}
                  </Text>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.mutedText}>Upgrade to Premium to view player prop predictions.</Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() =>
                navigation.navigate('Paywall', {
                  emphasizeTier: 'premium',
                  contextMessage: PREMIUM_PROPS_UNLOCK_CONTEXT,
                })
              }
            >
              <Text style={styles.upgradeButtonText}>View Premium</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      ) : null}

      {/* Game Info */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Game Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Scheduled Time:</Text>
          <Text style={styles.infoValue}>
            {new Date(currentGame.scheduled_time).toLocaleString()}
          </Text>
        </View>
        {currentGame.venue && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Venue:</Text>
            <Text style={styles.infoValue}>{currentGame.venue}</Text>
          </View>
        )}
      </View>

      {currentGame.status === 'finished' ? (
        <View style={styles.resultsSponsor}>
          <Text style={styles.resultsSponsorLabel}>After the match</Text>
          <HousePromotionCard
            surface="results"
            title="See what the model learned"
            subtitle="Review accuracy and explore the next slate while demand partners support free insights."
          />
        </View>
      ) : null}
    </ScrollView>
    <View style={[styles.bannerDock, { paddingBottom: insets.bottom }]}>
      <BannerStrip screen="GameDetail" />
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  bannerDock: {
    backgroundColor: theme.colors.backgroundElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderSubtle,
  },
  resultsSponsor: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  resultsSponsorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  league: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.accentDim,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  statusBadgeLive: {
    backgroundColor: theme.colors.secondaryDim,
    borderColor: theme.colors.secondary,
  },
  statusBadgeFinished: {
    backgroundColor: theme.colors.borderSubtle,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.8,
  },
  statusBadgeTextLive: {
    color: theme.colors.secondary,
  },
  statusBadgeTextFinished: {
    color: theme.colors.textMuted,
  },
  teamsSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundElevated,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  teamColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  vsDivider: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  teamRole: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  teamLogo: {
    width: 80,
    height: 80,
    marginBottom: theme.spacing.sm,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  vs: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  favButtonGreen: {
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  favButtonGreenDisabled: {
    backgroundColor: theme.colors.borderSubtle,
  },
  favButtonGreenText: {
    fontSize: 13,
    color: theme.colors.background,
    fontWeight: '700',
  },
  predictionSection: {
    marginBottom: theme.spacing.md,
  },
  predictionPlaceholder: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  predictionTapArea: {
    marginHorizontal: theme.spacing.md,
  },
  whyButton: {
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  whyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  whyButtonSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  shareButton: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accentDim,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  infoSection: {
    backgroundColor: theme.colors.backgroundElevated,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  playerPropsLoader: {
    marginVertical: theme.spacing.sm,
  },
  playerPropsError: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginVertical: theme.spacing.sm,
  },
  mutedText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  propRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  propPlayer: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  propMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  propPredicted: {
    fontSize: 13,
    color: theme.colors.accent,
    marginTop: 2,
  },
  upgradeButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.background,
  },
  liveUpdateRow: {
    marginTop: theme.spacing.sm,
  },
  liveScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  liveProbs: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
});

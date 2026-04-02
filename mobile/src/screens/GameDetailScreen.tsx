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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PredictionCard } from '../components/PredictionCard';
import { ExplanationView } from '../components/ExplanationView';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchGameDetails,
  fetchPrediction,
  fetchExplanation,
  clearPredictionForGameChange,
} from '../store/slices/gamesSlice';
import { apiService } from '../services/api';
import { Game } from '../types';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useLiveUpdates } from '../hooks/useLiveUpdates';
import { theme } from '../constants/theme';
import { formatLeagueLabel } from '../utils/predictionDisplay';

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
}

export const GameDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const { gameId } = route.params as { gameId: string };

  const { currentGame, currentPrediction, loading, loadingPrediction } = useAppSelector(
    (state) => state.games
  );

  const [refreshing, setRefreshing] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<Set<string>>(new Set());
  const [addingTeamId, setAddingTeamId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [playerProps, setPlayerProps] = useState<PlayerPropItem[]>([]);
  const [playerPropsLoading, setPlayerPropsLoading] = useState(false);
  const [playerPropsError, setPlayerPropsError] = useState<string | null>(null);

  const t = (subscriptionTier || 'free').toLowerCase();
  const isPremium =
    t === 'premium' || t === 'premium_plus' || t === 'trialing' || t === 'pro';
  const { lastUpdate, connected, error: liveError } = useLiveUpdates(gameId, { enabled: isPremium });

  useEffect(() => {
    setShowExplanation(false);
    dispatch(clearPredictionForGameChange());
    loadGameData();
  }, [gameId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const favs = (await apiService.getFavorites()) as FavoritesResponse;
        if (!cancelled && favs?.teams) {
          setFavoriteTeamIds(new Set(favs.teams.map((t) => t.id)));
        }
      } catch (_) {
        // ignore (e.g. not logged in)
      }
    })();
    return () => { cancelled = true; };
  }, [gameId]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (subscriptionTier !== 'premium' && subscriptionTier !== 'premium_plus') return;
    let cancelled = false;
    setPlayerPropsError(null);
    setPlayerPropsLoading(true);
    (async () => {
      try {
        const res = await apiService.getGamePlayerProps(gameId) as { props?: PlayerPropItem[] };
        if (!cancelled && res?.props) setPlayerProps(res.props);
      } catch (e: any) {
        if (!cancelled) setPlayerPropsError(getUserFriendlyMessage(e));
      } finally {
        if (!cancelled) setPlayerPropsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, subscriptionTier]);

  /** When the server writes a new prediction (WS signals), refresh game + prediction so analysis text matches. */
  useEffect(() => {
    if (!isPremium || !lastUpdate?.prediction_updated_at) return;
    dispatch(fetchGameDetails(gameId));
    dispatch(fetchPrediction(gameId));
  }, [lastUpdate?.prediction_updated_at, gameId, isPremium, dispatch]);

  const loadGameData = async () => {
    try {
      await Promise.all([
        dispatch(fetchGameDetails(gameId)),
        dispatch(fetchPrediction(gameId)),
      ]);
    } catch (error) {
      console.error('Error loading game data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadGameData();
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
      const res = await apiService.sharePick(gameId);
      if (res.image_base64 && (await Sharing.isAvailableAsync())) {
        const uri = `${FileSystem.cacheDirectory}octobet-share-${gameId}.png`;
        await FileSystem.writeAsStringAsync(uri, res.image_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Octobet pick',
        });
      } else {
        await Share.share({
          message: res.message,
          title: 'Octobet pick',
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
  const statusUpper = currentGame.status.toUpperCase();

  return (
    <ScrollView
      style={styles.container}
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

      {/* Teams / participants */}
      <View style={styles.teamsSection}>
        <View style={styles.teamContainer}>
          <Text style={styles.teamRole}>Home</Text>
          <Text style={styles.teamName}>{homeName}</Text>
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

        <Text style={styles.vs}>VS</Text>

        <View style={styles.teamContainer}>
          <Text style={styles.teamRole}>Away</Text>
          <Text style={styles.teamName}>{awayName}</Text>
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
            <View style={styles.predictionMetaRow}>
              <Text style={styles.predictionMetaText}>
                Updated: {new Date(currentPrediction.created_at).toLocaleTimeString()}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowExplanation(!showExplanation)}
              style={styles.predictionTapArea}
            >
              <PredictionCard
                prediction={currentPrediction}
                embedded
                homeTeamName={homeName}
                awayTeamName={awayName}
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
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share this pick</Text>
            </TouchableOpacity>
            {showExplanation && (
              <ExplanationView
                gameId={gameId}
                predictionId={currentPrediction.id}
                homeTeamName={homeName}
                awayTeamName={awayName}
                analysisAsOf={currentPrediction.created_at}
                analysisRefreshToken={
                  isPremium ? lastUpdate?.prediction_updated_at ?? null : null
                }
              />
            )}
          </>
        ) : (
          <View style={styles.predictionPlaceholder}>
            <Text style={styles.mutedText}>
              {isPremium
                ? 'Full analysis will be available closer to game time.'
                : 'No prediction available for this game.'}
            </Text>
          </View>
        )}
      </View>

      {/* Live updates (WebSocket, premium) */}
      {isPremium && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Live updates</Text>
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

      {/* Player Props */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Player props</Text>
        {(subscriptionTier === 'premium' || subscriptionTier === 'premium_plus') ? (
          <>
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
                    {prop.prop_type} — line {prop.line} {prop.unit}
                  </Text>
                  <Text style={styles.propPredicted}>
                    Predicted: {prop.predicted_value} {prop.unit}
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
              onPress={() => navigation.navigate('Paywall')}
            >
              <Text style={styles.upgradeButtonText}>View subscription</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.backgroundElevated,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  teamContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
    width: '100%',
  },
  teamRole: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  teamName: {
    fontSize: 22,
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginVertical: theme.spacing.sm,
  },
  favButtonGreen: {
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
    minWidth: 200,
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
  predictionMetaRow: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  predictionMetaText: {
    fontSize: 12,
    color: theme.colors.textMuted,
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

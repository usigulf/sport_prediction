import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { GameCard } from '../components/GameCard';
import { PredictionCard } from '../components/PredictionCard';
import { BestPickMiniCard, CARD_WIDTH_WITH_MARGIN } from '../components/BestPickMiniCard';
import { BestPicksCarousel } from '../components/BestPicksCarousel';
import { SportIconsRow } from '../components/SportIconsRow';
import { OctobetWordmark } from '../components/OctobetWordmark';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchUpcomingGames, restoreGamesFromCache } from '../store/slices/gamesSlice';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { SPORT_OPTIONS } from '../constants/leagues';
import { theme } from '../constants/theme';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

function formatCachedAt(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const getSportIcon = (leagueId: string): keyof typeof Ionicons.glyphMap => {
  switch (leagueId) {
    case 'nfl':
      return 'football';
    case 'nba':
      return 'basketball';
    case 'mlb':
      return 'baseball';
    case 'nhl':
      return 'snow'; // ionicons has no "ice-hockey"; snow suggests ice
    case 'soccer':
    case 'premier_league':
    case 'champions_league':
      return 'football';
    case 'boxing':
      return 'fitness';
    case 'tennis':
      return 'trophy';
    case 'golf':
      return 'trophy';
    case 'mma':
      return 'fitness';
    default:
      return 'football-outline';
  }
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { upcomingGames, loading, cachedAt } = useAppSelector((state) => state.games);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forYouPicks, setForYouPicks] = useState<any[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [accuracyPct, setAccuracyPct] = useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [challengeCount, setChallengeCount] = useState<number>(0);
  const [premiumTeaserDismissed, setPremiumTeaserDismissed] = useState(false);
  const [trendingPicks, setTrendingPicks] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState<{ leagues: number; teams: number } | null>(null);
  const [selectedFeaturedId, setSelectedFeaturedId] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    setLoadError(null);
    try {
      await dispatch(fetchUpcomingGames({ limit: 30 })).unwrap();
    } catch (error) {
      setLoadError(getUserFriendlyMessage(error));
    }
  }, [dispatch]);

  const loadForYou = useCallback(async () => {
    setForYouLoading(true);
    try {
      let leaguesParam: string | undefined;
      if (isAuthenticated) {
        try {
          const favs = (await apiService.getFavorites()) as { leagues?: { id: string }[] };
          const ids = favs.leagues?.map((l) => l.id).filter(Boolean) ?? [];
          if (ids.length > 0) leaguesParam = ids.join(',');
        } catch {
          // not logged in or favorites failed
        }
      }
      const res = await apiService.getTopPicks({ leagues: leaguesParam, limit: 10 });
      setForYouPicks(res.picks ?? []);
    } catch {
      setForYouPicks([]);
    } finally {
      setForYouLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    dispatch(restoreGamesFromCache());
    loadGames();
  }, [dispatch, loadGames]);

  useEffect(() => {
    loadForYou();
  }, [loadForYou]);

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    try {
      const res = await apiService.getTopPicks({ limit: 6 });
      setTrendingPicks(res.picks ?? []);
    } catch {
      setTrendingPicks([]);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    apiService.getAccuracy().then((d) => {
      if (d?.accuracy_pct != null) setAccuracyPct(Math.round(d.accuracy_pct));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoritesCount(null);
      return;
    }
    apiService.getCurrentUser().then((u: any) => {
      if (u?.subscription_tier) setSubscriptionTier(u.subscription_tier);
    }).catch(() => {});
    apiService.getChallenges({ limit: 50 }).then((r: any) => {
      setChallengeCount(r?.count ?? r?.challenges?.length ?? 0);
    }).catch(() => {});
    apiService.getFavorites().then((favs: any) => {
      setFavoritesCount({
        leagues: favs?.leagues?.length ?? 0,
        teams: favs?.teams?.length ?? 0,
      });
    }).catch(() => setFavoritesCount(null));
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadGames(),
      loadForYou(),
      loadTrending(),
      apiService.getAccuracy().then((d) => {
        if (d?.accuracy_pct != null) setAccuracyPct(Math.round(d.accuracy_pct));
      }).catch(() => {}),
      isAuthenticated ? apiService.getChallenges({ limit: 50 }).then((r: any) => {
        setChallengeCount(r?.count ?? r?.challenges?.length ?? 0);
      }).catch(() => {}) : Promise.resolve(),
      isAuthenticated ? apiService.getCurrentUser().then((u: any) => {
        if (u?.subscription_tier) setSubscriptionTier(u.subscription_tier);
      }).catch(() => {}) : Promise.resolve(),
      isAuthenticated ? apiService.getFavorites().then((favs: any) => {
        setFavoritesCount({
          leagues: favs?.leagues?.length ?? 0,
          teams: favs?.teams?.length ?? 0,
        });
      }).catch(() => setFavoritesCount(null)) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const handleGamePress = (gameId: string) => {
    navigation.navigate('GameDetail', { gameId });
  };

  const handleSportPress = (sportId: string) => {
    navigation.navigate('Games', { league: sportId });
  };

  // Group games by league
  const gamesByLeague = upcomingGames.reduce((acc, game) => {
    const league = game.league || 'other';
    if (!acc[league]) acc[league] = [];
    acc[league].push(game);
    return acc;
  }, {} as Record<string, typeof upcomingGames>);

  // Featured game: user-selected from carousel, or first with prediction, or first game
  const defaultFeatured = upcomingGames.find((g) => g.prediction) || upcomingGames[0];
  const featuredGame = selectedFeaturedId
    ? (upcomingGames.find((g) => g.id === selectedFeaturedId) ?? defaultFeatured)
    : defaultFeatured;
  const otherGames = upcomingGames.filter((g) => g.id !== featuredGame?.id);

  // Live games
  const liveGames = upcomingGames.filter((g) => g.status === 'live');

  const bestPicksFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (forYouPicks.length > 0) {
      Animated.timing(bestPicksFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      bestPicksFade.setValue(0);
    }
  }, [forYouPicks.length]);

  const liveDotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (liveGames.length === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(liveDotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [liveGames.length]);

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.headerTextContainer}>
              <OctobetWordmark variant="header" />
              <Text style={styles.headerSubtitle}>AI Picks That Win More</Text>
            </View>
          </View>
        </View>
        {cachedAt && !loadError && (
          <Text style={styles.lastUpdated}>Updated {formatCachedAt(cachedAt)}</Text>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
      {/* Hero strip: greeting + value prop + trust */}
      <View style={styles.heroStrip}>
        <Text style={styles.heroGreeting}>
          {isAuthenticated ? `${getGreeting()}${user?.email ? ` · ${user.email.split('@')[0]}` : ''}` : 'Welcome to Octobet'}
        </Text>
        <Text style={styles.heroHeadline}>AI Picks That Win More</Text>
        <Text style={styles.heroSub}>
          {forYouPicks.length > 0 ? `${forYouPicks.length} pick${forYouPicks.length === 1 ? '' : 's'} for you today` : '62%+ accuracy · Free daily picks · NFL, NBA, EPL & more'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trustRow} contentContainerStyle={styles.trustRowContent}>
          <TouchableOpacity onPress={() => navigation.navigate('Accuracy')} style={styles.trustPill}>
            <Text style={styles.trustPillText}>{accuracyPct != null ? `${accuracyPct}% accuracy` : '68% accuracy'}</Text>
            <Ionicons name="chevron-forward" size={12} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.trustPill}><Text style={styles.trustPillText}>4.9 ★</Text></View>
          <View style={styles.trustPill}><Text style={styles.trustPillText}>12k+ Users</Text></View>
        </ScrollView>
      </View>

      {/* User stats widget (when logged in and data available) */}
      {isAuthenticated && (accuracyPct != null || favoritesCount) && (
        <View style={styles.statsWidget}>
          {accuracyPct != null && (
            <TouchableOpacity
              style={styles.statsPill}
              onPress={() => navigation.navigate('Accuracy')}
              activeOpacity={0.8}
            >
              <Ionicons name="stats-chart" size={16} color={theme.colors.accent} />
              <Text style={styles.statsPillText}>Model: {accuracyPct}%</Text>
            </TouchableOpacity>
          )}
          {favoritesCount && (favoritesCount.leagues > 0 || favoritesCount.teams > 0) && (
            <TouchableOpacity
              style={styles.statsPill}
              onPress={() => navigation.navigate('Favorites')}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={16} color={theme.colors.accent} />
              <Text style={styles.statsPillText}>
                {favoritesCount.leagues > 0 && favoritesCount.teams > 0
                  ? `${favoritesCount.leagues} leagues · ${favoritesCount.teams} teams`
                  : favoritesCount.leagues > 0
                    ? `${favoritesCount.leagues} leagues`
                    : `${favoritesCount.teams} teams`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sport filter icons row (tap → Games tab with league pre-selected) */}
      <SportIconsRow onSportPress={handleSportPress} />

      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
          {cachedAt && upcomingGames.length > 0 && (
            <Text style={styles.cacheHint}>Showing cached data from {formatCachedAt(cachedAt)}</Text>
          )}
        </View>
      ) : null}

      {/* Best Picks for You: horizontal carousel (3–5 mini cards) or empty state */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TOP VALUE TODAY</Text>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={20} color={theme.colors.accent} />
          <Text style={styles.sectionTitle}>Best Picks for You</Text>
          {forYouPicks.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Games')} style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        {forYouLoading && forYouPicks.length === 0 ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '70%', marginTop: 8 }]} />
                <View style={[styles.skeletonLine, { width: '50%', marginTop: 8 }]} />
              </View>
            ))}
          </View>
        ) : forYouPicks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No high-confidence picks right now</Text>
            <Text style={styles.emptyStateSub}>Check back before game time for fresh AI picks.</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={() => navigation.navigate('Games')}>
              <Text style={styles.emptyStateButtonText}>Browse all games</Text>
              <Ionicons name="arrow-forward" size={18} color={theme.colors.background} />
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{ opacity: bestPicksFade }}>
            <BestPicksCarousel
              picks={forYouPicks.slice(0, 5)}
              onPickPress={(id) => handleGamePress(id)}
              onSetFeatured={(id) => setSelectedFeaturedId(id)}
            />
          </Animated.View>
        )}
      </View>

      {/* Trending / Hot Right Now */}
      {(trendingLoading || trendingPicks.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={18} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>HOT RIGHT NOW</Text>
          </View>
          {trendingLoading && trendingPicks.length === 0 ? (
            <View style={styles.skeletonContainer}>
              {[1, 2].map((i) => (
                <View key={i} style={styles.skeletonCard}>
                  <View style={styles.skeletonLine} />
                  <View style={[styles.skeletonLine, { width: '70%', marginTop: 8 }]} />
                </View>
              ))}
            </View>
          ) : trendingPicks.length > 0 ? (
            <FlatList
              data={trendingPicks.slice(0, 4)}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bestPicksCarousel}
              getItemLayout={(_: any, index: number) => ({
                length: CARD_WIDTH_WITH_MARGIN,
                offset: CARD_WIDTH_WITH_MARGIN * index,
                index,
              })}
              renderItem={({ item }) => (
                <BestPickMiniCard pick={item} onPress={() => handleGamePress(item.id)} />
              )}
            />
          ) : null}
        </View>
      )}

      {/* Live Games Section */}
      {liveGames.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>IN-PLAY</Text>
          <View style={styles.sectionHeader}>
            <Animated.View style={[styles.liveIndicator, { opacity: liveDotOpacity }]} />
            <Text style={styles.sectionTitle}>Live Now</Text>
          </View>
          {liveGames.slice(0, 3).map((game) => (
            <TouchableOpacity key={game.id} onPress={() => handleGamePress(game.id)}>
              <GameCard game={game} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Featured Game */}
      {featuredGame && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AI PICK</Text>
          <View style={styles.featuredBadgeWrap}>
            <View style={styles.featuredBadge}>
              <Ionicons name="sparkles" size={14} color={theme.colors.accent} />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
            <Text style={styles.sectionTitle}>Featured Game</Text>
          </View>
          <TouchableOpacity onPress={() => handleGamePress(featuredGame.id)} activeOpacity={0.9}>
            <View style={styles.featuredCard}>
              <GameCard game={featuredGame} />
              {featuredGame.prediction && (
                <View style={styles.featuredPrediction}>
                  <PredictionCard prediction={featuredGame.prediction} />
                </View>
              )}
            </View>
          </TouchableOpacity>
          {featuredGame.prediction && (
            <TouchableOpacity
              style={styles.whyPickButton}
              onPress={() => handleGamePress(featuredGame.id)}
            >
              <Ionicons name="document-text-outline" size={16} color={theme.colors.accent} />
              <Text style={styles.whyPickText}>View analysis</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Challenge CTA */}
      {isAuthenticated && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.challengeCTA}
            onPress={() => navigation.navigate('Challenges')}
            activeOpacity={0.9}
          >
            <Ionicons name="trophy" size={24} color={theme.colors.accent} />
            <View style={styles.challengeCTAText}>
              <Text style={styles.challengeCTATitle}>
                {challengeCount > 0 ? `You have ${challengeCount} challenge${challengeCount === 1 ? '' : 's'}` : 'Start a challenge'}
              </Text>
              <Text style={styles.challengeCTASub}>
                {challengeCount > 0 ? 'View your challenges' : 'Pick games and track your picks vs the model'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Premium teaser (dismissible, hidden when premium) */}
      {isAuthenticated && subscriptionTier !== 'premium' && subscriptionTier !== 'premium_plus' && !premiumTeaserDismissed && (
        <View style={styles.section}>
          <View style={styles.premiumTeaser}>
            <TouchableOpacity
              style={styles.premiumTeaserDismiss}
              onPress={() => setPremiumTeaserDismissed(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.premiumTeaserTitle}>Live picks & full analysis</Text>
            <Text style={styles.premiumTeaserSub}>7-day free trial — no card required</Text>
            <TouchableOpacity
              style={styles.premiumTeaserButton}
              onPress={() => navigation.navigate('Paywall')}
              activeOpacity={0.9}
            >
              <Text style={styles.premiumTeaserButtonText}>Try free</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Games by League */}
      {Object.entries(gamesByLeague).map(([league, games]) => {
        if (games.length === 0 || games[0]?.id === featuredGame?.id) return null;
        const leagueLabel = SPORT_OPTIONS.find((s) => s.id === league)?.label || league.toUpperCase().replace('_', ' ');
        return (
          <View key={league} style={styles.section}>
            <Text style={styles.sectionLabel}>{leagueLabel.toUpperCase()}</Text>
            <View style={styles.sectionHeader}>
              <Ionicons name={getSportIcon(league)} size={20} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>{leagueLabel}</Text>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Games');
                }}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {games.slice(0, 3).map((game) => (
              <TouchableOpacity key={game.id} onPress={() => handleGamePress(game.id)}>
                <GameCard game={game} />
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {loading && upcomingGames.length === 0 && (
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '75%', marginTop: 8 }]} />
            <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
          </View>
          <View style={[styles.skeletonCard, { marginTop: 12 }]}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '70%', marginTop: 8 }]} />
          </View>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading games...</Text>
          </View>
        </View>
      )}

      {!loading && upcomingGames.length === 0 && !loadError && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No upcoming games</Text>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.backgroundElevated,
    paddingHorizontal: theme.spacing.md + 4,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerContent: {
    marginBottom: theme.spacing.xs,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  lastUpdated: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  heroStrip: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroGreeting: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  heroHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  trustRow: {
    marginTop: theme.spacing.md,
  },
  trustRowContent: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  trustPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statsWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  statsPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  skeletonContainer: {
    paddingVertical: theme.spacing.sm,
  },
  skeletonCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: theme.colors.borderSubtle,
    borderRadius: 4,
    width: '90%',
  },
  emptyState: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.md,
  },
  emptyStateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.background,
  },
  whyPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    paddingVertical: 6,
  },
  whyPickText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  challengeCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  challengeCTAText: {
    flex: 1,
  },
  challengeCTATitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  challengeCTASub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  premiumTeaser: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.accentDim,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    position: 'relative',
  },
  premiumTeaserDismiss: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 1,
  },
  premiumTeaserTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  premiumTeaserSub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  premiumTeaserButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
  },
  premiumTeaserButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.background,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: theme.colors.accent,
    marginBottom: 4,
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm + 4,
    gap: theme.spacing.sm,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
  },
  featuredBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm + 4,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.accentDim,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  seeAllButton: {
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.xs,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  featuredCard: {
    marginBottom: theme.spacing.sm,
  },
  bestPicksCarousel: {
    paddingVertical: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  forYouCard: {
    marginBottom: theme.spacing.sm,
  },
  forYouPrediction: {
    marginTop: theme.spacing.xs,
  },
  featuredPrediction: {
    marginTop: -theme.spacing.sm,
  },
  errorBanner: {
    backgroundColor: theme.colors.secondaryDim,
    padding: theme.spacing.sm + 4,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm + 4,
    borderRadius: theme.radii.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  cacheHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm + 4,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
});

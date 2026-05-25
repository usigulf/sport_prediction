import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { GameCard } from '../components/GameCard';
import { PredictionCard } from '../components/PredictionCard';
import { ExplanationView } from '../components/ExplanationView';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchUpcomingGames, restoreGamesFromCache } from '../store/slices/gamesSlice';
import { apiService } from '../services/api';
import { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import {
  SPORT_OPTIONS,
  MY_LEAGUES_ID,
  SOCCER_LEAGUE_IDS,
  GAMES_ALL_SPORTS_SUBTITLE,
} from '../constants/leagues';
import { theme } from '../constants/theme';
import type { PredictionExplanation } from '../types';
import {
  buildSoccerWeekDays,
  formatLocalYMD,
  mondayBasedIndexInWeek,
  weekRangeLabel,
} from '../utils/soccerWeek';

/** BetQL-style sub-views within Games (per sport). */
type GamesViewType = 'model' | 'trending' | 'props';

type SoccerSubFilter = 'all' | (typeof SOCCER_LEAGUE_IDS)[number];

type GamesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

function formatCachedAt(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export const GamesScreen: React.FC = () => {
  const navigation = useNavigation<GamesScreenNavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Games'>>();
  const dispatch = useAppDispatch();
  const { upcomingGames, loading, cachedAt } = useAppSelector((state) => state.games);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  // When opened from Home sport icon with a league, pre-select that filter
  useEffect(() => {
    const league = route.params?.league;
    if (league != null) setSelectedLeague(league);
  }, [route.params?.league]);

  useEffect(() => {
    const prev = prevLeagueRef.current;
    prevLeagueRef.current = selectedLeague;
    if (selectedLeague === 'soccer' && prev !== 'soccer') {
      setSoccerWeekOffset(0);
      setSoccerDayIndex(mondayBasedIndexInWeek(new Date()));
      setSoccerSubLeague('all');
    }
  }, [selectedLeague]);
  const [gamesView, setGamesView] = useState<GamesViewType>('model');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trendingPicks, setTrendingPicks] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [previewGame, setPreviewGame] = useState<any | null>(null);
  const [previewHydrated, setPreviewHydrated] = useState<any | null>(null);
  const [previewExplanation, setPreviewExplanation] = useState<PredictionExplanation | null>(null);
  const [previewExplanationLoading, setPreviewExplanationLoading] = useState(false);
  const [previewExplanationError, setPreviewExplanationError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sheetMaxHeight = useMemo(
    () => Math.round(Dimensions.get('window').height * 0.9),
    []
  );
  const insets = useSafeAreaInsets();
  const prevLeagueRef = useRef<string | null | undefined>(undefined);

  /** Soccer hub: Monday-start week offset, selected day 0–6, competition filter */
  const [soccerWeekOffset, setSoccerWeekOffset] = useState(0);
  const [soccerDayIndex, setSoccerDayIndex] = useState(() => mondayBasedIndexInWeek(new Date()));
  const [soccerSubLeague, setSoccerSubLeague] = useState<SoccerSubFilter>('all');

  const soccerWeekDays = useMemo(() => buildSoccerWeekDays(soccerWeekOffset), [soccerWeekOffset]);
  const selectedSoccerYmd =
    soccerWeekDays[soccerDayIndex]?.ymd ?? formatLocalYMD(new Date());

  useEffect(() => {
    dispatch(restoreGamesFromCache());
  }, []);

  const loadGames = async (signal?: AbortSignal) => {
    setLoadError(null);
    const opts = { limit: 50, signal };
    try {
      if (selectedLeague === MY_LEAGUES_ID) {
        try {
          const favs = (await apiService.getFavorites()) as { leagues?: { id: string }[] };
          const leagueIds = favs.leagues?.map((l) => l.id) ?? [];
          await dispatch(
            fetchUpcomingGames({
              ...opts,
              leagues: leagueIds.length > 0 ? leagueIds.join(',') : undefined,
            })
          ).unwrap();
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') return;
          await dispatch(fetchUpcomingGames(opts)).unwrap();
        }
      } else if (selectedLeague === 'soccer') {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const leaguesArg =
          soccerSubLeague === 'all'
            ? SOCCER_LEAGUE_IDS.join(',')
            : soccerSubLeague;
        await dispatch(
          fetchUpcomingGames({
            ...opts,
            leagues: leaguesArg,
            date: selectedSoccerYmd,
            time_zone: tz,
            limit: Math.max(opts.limit ?? 50, 100),
          })
        ).unwrap();
      } else {
        await dispatch(
          fetchUpcomingGames({ ...opts, league: selectedLeague || undefined })
        ).unwrap();
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      setLoadError(getUserFriendlyMessage(error));
    }
  };

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadGames(controller.signal);
    return () => controller.abort();
  }, [selectedLeague, selectedSoccerYmd, soccerSubLeague]);

  const getLeaguesParam = useCallback((): string | undefined => {
    if (selectedLeague === null) return undefined;
    if (selectedLeague === MY_LEAGUES_ID) return undefined;
    if (selectedLeague === 'soccer') {
      return soccerSubLeague === 'all'
        ? SOCCER_LEAGUE_IDS.join(',')
        : soccerSubLeague;
    }
    return selectedLeague;
  }, [selectedLeague, soccerSubLeague]);

  useEffect(() => {
    if (gamesView !== 'trending') return;
    let cancelled = false;
    setTrendingLoading(true);
    const leaguesParam = getLeaguesParam();
    const soccerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const topPicksOpts =
      selectedLeague === 'soccer'
        ? {
            leagues: leaguesParam,
            limit: 30,
            date: selectedSoccerYmd,
            time_zone: soccerTz,
          }
        : { leagues: leaguesParam, limit: 30 };
    apiService.getTopPicks(topPicksOpts).then((res) => {
      if (!cancelled) setTrendingPicks(res.picks ?? []);
    }).catch(() => {
      if (!cancelled) setTrendingPicks([]);
    }).finally(() => {
      if (!cancelled) setTrendingLoading(false);
    });
    return () => { cancelled = true; };
  }, [gamesView, selectedLeague, getLeaguesParam, selectedSoccerYmd]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGames();
    if (gamesView === 'trending') {
      const leaguesParam = getLeaguesParam();
      const soccerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const topPicksOpts =
        selectedLeague === 'soccer'
          ? {
              leagues: leaguesParam,
              limit: 30,
              date: selectedSoccerYmd,
              time_zone: soccerTz,
            }
          : { leagues: leaguesParam, limit: 30 };
      const res = await apiService.getTopPicks(topPicksOpts).catch(() => ({ picks: [] }));
      setTrendingPicks(res.picks ?? []);
    }
    setRefreshing(false);
  };

  /** Tap game → bottom sheet with prediction + full analysis; CTA opens Game Detail for props / live / share. */
  const useBottomSheetPreview = true;

  const handleGamePress = (game: any) => {
    if (useBottomSheetPreview) {
      setPreviewHydrated(null);
      setPreviewExplanation(null);
      setPreviewExplanationError(null);
      setPreviewExplanationLoading(true);
      setPreviewGame(game);
    } else {
      navigation.navigate('GameDetail', { gameId: game.id });
    }
  };

  const closePreview = () => {
    setPreviewGame(null);
    setPreviewHydrated(null);
    setPreviewExplanation(null);
    setPreviewExplanationError(null);
    setPreviewExplanationLoading(false);
  };

  /** Hydrate from GET /games/:id (list rows often omit prediction) + fetch full explanation by game id. */
  useEffect(() => {
    if (!previewGame?.id) {
      setPreviewHydrated(null);
      setPreviewExplanation(null);
      setPreviewExplanationError(null);
      setPreviewExplanationLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewExplanationLoading(true);
    setPreviewExplanationError(null);
    setPreviewExplanation(null);
    setPreviewHydrated(null);

    (async () => {
      try {
        const game = await apiService.getGame(previewGame.id);
        if (!cancelled) setPreviewHydrated(game as any);
      } catch {
        if (!cancelled) setPreviewHydrated(null);
      }
      try {
        const expl = await apiService.getPredictionExplanation(previewGame.id);
        if (!cancelled) setPreviewExplanation(expl as PredictionExplanation);
      } catch (e: unknown) {
        if (!cancelled) setPreviewExplanationError(getUserFriendlyMessage(e));
      } finally {
        if (!cancelled) setPreviewExplanationLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewGame?.id]);

  /** Merged list row + GET /games/:id so preview has prediction & teams when the list omitted them. */
  const previewSheetGame = useMemo(
    () => (previewGame ? previewHydrated ?? previewGame : null),
    [previewGame, previewHydrated]
  );

  const openFullAnalysis = (gameId: string) => {
    closePreview();
    navigation.navigate('GameDetail', { gameId });
  };

  const renderGame = ({ item }: { item: any }) => (
    <GameCard game={item} onPress={() => handleGamePress(item)} />
  );

  const renderTrendingItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => handleGamePress(item)} activeOpacity={1}>
      <View style={styles.trendingCard}>
        <GameCard game={item} onPress={() => handleGamePress(item)} />
        {item.prediction && (
          <View style={styles.trendingPrediction}>
            <PredictionCard prediction={item.prediction} league={item.league} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const subTabs: { key: GamesViewType; label: string }[] = [
    { key: 'model', label: 'Model Picks' },
    { key: 'trending', label: 'Trending Picks' },
    { key: 'props', label: 'Player Props' },
  ];

  return (
    <View style={styles.container}>
      {/* Sport strip (BetQL: sport-first) */}
      <View style={styles.headerSection}>
        <View style={styles.headerTextRow}>
          <Text style={styles.headerTitle}>Games</Text>
          <Text style={styles.headerSubtitle}>
            {selectedLeague === 'soccer'
              ? 'Pick a day — all soccer competitions for that date'
              : selectedLeague == null
                ? GAMES_ALL_SPORTS_SUBTITLE
                : 'Pick a sport, then a view'}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sportStrip}
          style={styles.sportStripScroll}
        >
          <TouchableOpacity
            style={[
              styles.sportPill,
              selectedLeague === null && styles.sportPillActive,
            ]}
            onPress={() => setSelectedLeague(null)}
          >
            <Text style={[styles.sportPillText, selectedLeague === null && styles.sportPillTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sportPill, selectedLeague === MY_LEAGUES_ID && styles.sportPillActive]}
            onPress={() => setSelectedLeague(MY_LEAGUES_ID)}
          >
            <Text style={[styles.sportPillText, selectedLeague === MY_LEAGUES_ID && styles.sportPillTextActive]}>My leagues</Text>
          </TouchableOpacity>
          {SPORT_OPTIONS.map((sport) => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.sportPill, selectedLeague === sport.id && styles.sportPillActive]}
              onPress={() => setSelectedLeague(sport.id)}
            >
              <Text style={[styles.sportPillText, selectedLeague === sport.id && styles.sportPillTextActive]}>{sport.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedLeague === 'soccer' && (
          <View style={styles.soccerHub}>
            <View style={styles.weekNavRow}>
              <TouchableOpacity
                onPress={() => setSoccerWeekOffset((w) => w - 1)}
                style={styles.weekNavBtn}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={22} color={theme.colors.accent} />
              </TouchableOpacity>
              <Text style={styles.weekNavLabel}>{weekRangeLabel(soccerWeekDays)}</Text>
              <TouchableOpacity
                onPress={() => setSoccerWeekOffset((w) => w + 1)}
                style={styles.weekNavBtn}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={22} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
            <Text style={styles.soccerWeekHint}>
              Fixtures shown here are from your server database (Sportradar sync), not live TV listings. Use
              arrows to move weeks — e.g. mid‑April games are often one or more weeks ahead of “today”.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayStrip}
            >
              {soccerWeekDays.map((d, i) => (
                <TouchableOpacity
                  key={d.ymd}
                  style={[
                    styles.dayChip,
                    soccerDayIndex === i && styles.dayChipActive,
                    d.isToday && styles.dayChipToday,
                  ]}
                  onPress={() => setSoccerDayIndex(i)}
                >
                  <Text
                    style={[
                      styles.dayChipWeekday,
                      soccerDayIndex === i && styles.dayChipTextActive,
                    ]}
                  >
                    {d.weekdayShort}
                  </Text>
                  <Text
                    style={[
                      styles.dayChipNum,
                      soccerDayIndex === i && styles.dayChipTextActive,
                    ]}
                  >
                    {d.dayNum}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.soccerFilterLabel}>Competition</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.soccerSubLeagueRow}
            >
              {(
                [
                  { id: 'all' as const, label: 'All soccer' },
                  { id: 'premier_league' as const, label: 'Premier League' },
                  { id: 'champions_league' as const, label: 'Champions League' },
                  { id: 'la_liga' as const, label: 'La Liga' },
                  { id: 'serie_a' as const, label: 'Serie A' },
                  { id: 'bundesliga' as const, label: 'Bundesliga' },
                  { id: 'mls' as const, label: 'MLS' },
                ] satisfies { id: SoccerSubFilter; label: string }[]
              ).map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.soccerSubPill,
                    soccerSubLeague === opt.id && styles.soccerSubPillActive,
                  ]}
                  onPress={() => setSoccerSubLeague(opt.id)}
                >
                  <Text
                    style={[
                      styles.soccerSubPillText,
                      soccerSubLeague === opt.id && styles.soccerSubPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* BetQL-style sub-tabs: Model Picks | Trending Picks | Player Props */}
        <View style={styles.subTabRow}>
          {subTabs.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.subTab, gamesView === key && styles.subTabActive]}
              onPress={() => setGamesView(key)}
            >
              <Text style={[styles.subTabText, gamesView === key && styles.subTabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {(gamesView === 'model' || gamesView === 'props') && (
        <FlatList
          data={upcomingGames}
          renderItem={renderGame}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <>
              {gamesView === 'props' ? (
                <View style={styles.propsTabHint}>
                  <Text style={styles.propsTabHintText}>
                    Tap a game, then scroll to Player Props on the game screen (Premium or Pro).
                  </Text>
                </View>
              ) : null}
              {loadError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{loadError}</Text>
                  {cachedAt && upcomingGames.length > 0 ? (
                    <Text style={styles.cacheHint}>Offline – showing cached data from {formatCachedAt(cachedAt)}</Text>
                  ) : null}
                </View>
              ) : null}
              {!loadError && cachedAt && upcomingGames.length > 0 ? (
                <View style={styles.updatedBar}>
                  <Text style={styles.updatedText}>Updated at {formatCachedAt(cachedAt)}</Text>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {loading
                  ? 'Loading games...'
                  : selectedLeague === 'soccer'
                    ? 'No games for this day in the app. Try the week arrows — or sync schedules on the server (see note above).'
                    : 'No games found'}
              </Text>
            </View>
          }
        />
      )}

      {gamesView === 'trending' && (
        trendingLoading && trendingPicks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.emptyText}>Loading trending picks...</Text>
          </View>
        ) : (
          <FlatList
            data={trendingPicks}
            renderItem={renderTrendingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No trending picks for this league right now.</Text>
              </View>
            }
          />
        )
      )}

      {/* Bottom sheet: matchup + prediction + full ExplanationView; CTA opens Game Detail */}
      <Modal
        visible={!!previewGame}
        transparent
        animationType="slide"
        onRequestClose={closePreview}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closePreview}>
          <Pressable
            style={[
              styles.sheetContent,
              {
                paddingBottom: insets.bottom + theme.spacing.md,
                height: sheetMaxHeight,
                maxHeight: sheetMaxHeight,
                flexDirection: 'column',
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            {previewSheetGame && (
              <View style={styles.sheetInner}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Game preview</Text>
                  <TouchableOpacity onPress={closePreview} hitSlop={12} style={styles.sheetClose}>
                    <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.sheetBody}>
                  <ScrollView
                    style={styles.sheetScroll}
                    contentContainerStyle={styles.sheetScrollContent}
                    showsVerticalScrollIndicator
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    <GameCard game={previewSheetGame} />
                    {previewSheetGame.prediction ? (
                      <View style={styles.sheetPrediction}>
                        <PredictionCard
                          prediction={previewSheetGame.prediction}
                          league={previewSheetGame.league}
                          embedded
                          homeTeamName={previewSheetGame.home_team?.name ?? 'Home'}
                          awayTeamName={previewSheetGame.away_team?.name ?? 'Away'}
                        />
                      </View>
                    ) : null}
                    <Text style={styles.sheetAnalysisPull}>
                      {previewSheetGame.prediction
                        ? 'Full written analysis below — scroll this section.'
                        : 'Full written analysis below.'}
                    </Text>
                    <View style={styles.sheetExplanation}>
                      <Text style={styles.sheetAnalysisHeading}>Full analysis</Text>
                      <ExplanationView
                        gameId={previewSheetGame.id}
                        predictionId={previewSheetGame.prediction?.id ?? previewSheetGame.id}
                        homeTeamName={previewSheetGame.home_team?.name ?? 'Home'}
                        awayTeamName={previewSheetGame.away_team?.name ?? 'Away'}
                        analysisAsOf={previewSheetGame.prediction?.created_at}
                        league={previewSheetGame.league}
                        homeWinProbability={previewSheetGame.prediction?.home_win_probability}
                        awayWinProbability={previewSheetGame.prediction?.away_win_probability}
                        external={{
                          explanation: previewExplanation,
                          loading: previewExplanationLoading,
                          error: previewExplanationError,
                        }}
                      />
                    </View>
                  </ScrollView>
                  <View style={styles.sheetFooter}>
                    <TouchableOpacity
                      style={styles.sheetCta}
                      onPress={() => openFullAnalysis(previewSheetGame.id)}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel="See full game"
                    >
                      <Text style={styles.sheetCtaText}>See full game</Text>
                      <Ionicons name="arrow-forward" size={20} color={theme.colors.background} />
                    </TouchableOpacity>
                    <Text style={styles.sheetHint}>
                      Player props, live updates & share — detail page
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerSection: {
    backgroundColor: theme.colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingTop: theme.spacing.sm + 4,
    paddingBottom: theme.spacing.sm + 4,
  },
  headerTextRow: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm + 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sportStripScroll: {
    maxHeight: 44,
  },
  sportStrip: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm + 4,
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  sportPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundCard,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  sportPillActive: {
    backgroundColor: theme.colors.accentDim,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  sportPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sportPillTextActive: {
    color: theme.colors.accent,
  },
  soccerHub: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    marginTop: theme.spacing.sm,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  weekNavBtn: {
    padding: theme.spacing.xs,
    minWidth: theme.minTouchSize,
    alignItems: 'center',
  },
  weekNavLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  soccerWeekHint: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  dayStrip: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
    gap: 8,
    paddingBottom: theme.spacing.sm,
  },
  dayChip: {
    width: 48,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  dayChipToday: {
    borderColor: theme.colors.accent,
  },
  dayChipActive: {
    backgroundColor: theme.colors.accentDim,
    borderColor: theme.colors.accent,
  },
  dayChipWeekday: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  dayChipNum: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  dayChipTextActive: {
    color: theme.colors.accent,
  },
  soccerFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    marginBottom: 6,
  },
  soccerSubLeagueRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
    gap: 8,
    paddingBottom: theme.spacing.sm,
  },
  soccerSubPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  soccerSubPillActive: {
    backgroundColor: theme.colors.accentDim,
    borderColor: theme.colors.accent,
  },
  soccerSubPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  soccerSubPillTextActive: {
    color: theme.colors.accent,
  },
  subTabRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  subTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.sm,
  },
  subTabActive: {
    backgroundColor: theme.colors.accentDim,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  subTabTextActive: {
    color: theme.colors.accent,
  },
  trendingCard: {
    marginBottom: theme.spacing.sm,
  },
  trendingPrediction: {
    marginTop: theme.spacing.xs,
    marginHorizontal: 0,
  },
  propsTabHint: {
    backgroundColor: theme.colors.accentDim,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm + 4,
    borderRadius: theme.radii.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  propsTabHintText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  listContent: {
    padding: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  errorBanner: {
    backgroundColor: theme.colors.secondaryDim,
    padding: theme.spacing.sm + 4,
    margin: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  cacheHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  updatedBar: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accentDim,
  },
  updatedText: {
    fontSize: 12,
    color: theme.colors.accent,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
  },
  sheetInner: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    flexDirection: 'column',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sheetClose: {
    padding: theme.spacing.xs,
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  sheetScrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  sheetFooter: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.background,
  },
  sheetPrediction: {
    marginTop: theme.spacing.sm,
  },
  sheetAnalysisPull: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    lineHeight: 17,
  },
  sheetExplanation: {
    marginTop: theme.spacing.sm,
  },
  sheetAnalysisHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  sheetCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: theme.spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.md,
  },
  sheetCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.background,
  },
  sheetHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameCard } from '../../components/GameCard';
import { PredictionCard } from '../../components/PredictionCard';
import { BestPickMiniCard, CARD_WIDTH_WITH_MARGIN, type BestPickItem } from '../../components/BestPickMiniCard';
import { BestPicksCarousel } from '../../components/BestPicksCarousel';
import { FeedSkeleton } from '../../components/feed/FeedSkeleton';
import { FeedErrorBanner } from '../../components/feed/FeedErrorBanner';
import { FeedEmptyState } from '../../components/feed/FeedEmptyState';
import { PredictionDisclaimer } from '../../components/PredictionDisclaimer';
import { PREMIUM_TRIAL_DAYS } from '../../constants/subscriptionPricing';
import { PREMIUM_PAYWALL_CONTEXT } from '../../constants/premiumCopy';
import { compareLeagueDisplayOrder, isSoccerLeague } from '../../constants/leagues';
import { formatLeagueLabel } from '../../utils/leagueDisplay';
import { theme } from '../../constants/theme';
import { hasProAccess } from '../../utils/subscription';
import { NativeFeedAdCard } from '../../ads/components/NativeFeedAdCard';
import type { useAdEngine } from '../../ads/engine/AdEngineContext';
import type { Game } from '../../types';
import { formatCachedAt, getSportIcon } from './homeScreenUtils';
import type { HomeScreenNavigationProp } from './homeScreenUtils';
import { homeScreenStyles as styles } from './homeScreenStyles';
import { useLayout } from '../../hooks/useLayout';

type AdEngineState = ReturnType<typeof useAdEngine>;

type Props = {
  navigation: HomeScreenNavigationProp;
  adEngine: AdEngineState;
  isAuthenticated: boolean;
  subscriptionTier: string;
  challengeCount: number;
  premiumTeaserDismissed: boolean;
  onDismissPremiumTeaser: () => void;
  loadError: string | null;
  cachedAt: string | null;
  upcomingGames: Game[];
  loading: boolean;
  forYouPicks: BestPickItem[];
  forYouLoading: boolean;
  forYouError: string | null;
  onRetryForYou: () => void;
  onRetryGames: () => void;
  trendingPicks: BestPickItem[];
  trendingLoading: boolean;
  trendingError: string | null;
  onRetryTrending: () => void;
  liveGames: Game[];
  liveDotOpacity: Animated.Value;
  featuredGame: Game | undefined;
  gamesByLeague: Record<string, Game[]>;
  onGamePress: (gameId: string) => void;
  onPickPress: (pick: BestPickItem) => void;
  onSetFeatured: (id: string) => void;
};

export function HomeGamesErrorBanner({
  loadError,
  cachedAt,
  upcomingCount,
  onRetry,
}: {
  loadError: string | null;
  cachedAt: string | null;
  upcomingCount: number;
  onRetry?: () => void;
}) {
  if (!loadError) return null;
  return (
    <FeedErrorBanner
      message={loadError}
      onRetry={onRetry}
      cacheHint={
        cachedAt && upcomingCount > 0
          ? `Showing cached data from ${formatCachedAt(cachedAt)}`
          : null
      }
    />
  );
}

export function HomeForYouSection({
  navigation,
  forYouPicks,
  forYouLoading,
  forYouError,
  onRetryForYou,
  onPickPress,
  onSetFeatured,
  bestPicksFade,
}: {
  navigation: HomeScreenNavigationProp;
  forYouPicks: BestPickItem[];
  forYouLoading: boolean;
  forYouError: string | null;
  onRetryForYou: () => void;
  onPickPress: (pick: BestPickItem) => void;
  onSetFeatured: (id: string) => void;
  bestPicksFade: Animated.Value;
}) {
  const { contentMaxWidth, isWide } = useLayout();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>TOP VALUE TODAY</Text>
      <View style={styles.sectionHeader}>
        <Ionicons name="star" size={20} color={theme.colors.accent} />
        <Text style={styles.sectionTitle}>Best Picks for You</Text>
        {forYouPicks.length > 0 ? (
          <TouchableOpacity onPress={() => navigation.navigate('Games')} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {forYouError ? (
        <FeedErrorBanner message={forYouError} onRetry={onRetryForYou} />
      ) : null}
      {forYouLoading && forYouPicks.length === 0 && !forYouError ? (
        <FeedSkeleton count={3} variant="row" />
      ) : forYouPicks.length === 0 && !forYouError ? (
        <FeedEmptyState
          icon="star-outline"
          title="No high-confidence picks right now"
          subtitle="Check back before game time for fresh AI picks."
          actionLabel="Browse all games"
          onAction={() => navigation.navigate('Games')}
        />
      ) : (
        <Animated.View style={{ opacity: bestPicksFade }}>
          <BestPicksCarousel
            picks={forYouPicks.slice(0, 5)}
            onPickPress={onPickPress}
            onSetFeatured={onSetFeatured}
            contentWidth={isWide ? contentMaxWidth : undefined}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function HomeTrendingSection({
  trendingPicks,
  trendingLoading,
  trendingError,
  onRetryTrending,
  onPickPress,
}: {
  trendingPicks: BestPickItem[];
  trendingLoading: boolean;
  trendingError: string | null;
  onRetryTrending: () => void;
  onPickPress: (pick: BestPickItem) => void;
}) {
  if (!trendingLoading && trendingPicks.length === 0 && !trendingError) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="flame" size={18} color={theme.colors.accent} />
        <Text style={styles.sectionTitle}>LIVE PICKS</Text>
      </View>
      {trendingError ? (
        <FeedErrorBanner message={trendingError} onRetry={onRetryTrending} />
      ) : null}
      {trendingLoading && trendingPicks.length === 0 && !trendingError ? (
        <FeedSkeleton count={2} variant="row" />
      ) : trendingPicks.length > 0 ? (
        <FlatList
          data={trendingPicks.slice(0, 4)}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bestPicksCarousel}
          getItemLayout={(_: unknown, index: number) => ({
            length: CARD_WIDTH_WITH_MARGIN,
            offset: CARD_WIDTH_WITH_MARGIN * index,
            index,
          })}
          renderItem={({ item }) => (
            <BestPickMiniCard pick={item} onPress={() => onPickPress(item)} />
          )}
        />
      ) : null}
    </View>
  );
}

export function HomeFeedSections({
  navigation,
  adEngine,
  isAuthenticated,
  subscriptionTier,
  challengeCount,
  premiumTeaserDismissed,
  onDismissPremiumTeaser,
  loadError,
  cachedAt,
  upcomingGames,
  loading,
  forYouPicks,
  forYouLoading,
  forYouError,
  onRetryForYou,
  onRetryGames,
  trendingPicks,
  trendingLoading,
  trendingError,
  onRetryTrending,
  liveGames,
  liveDotOpacity,
  featuredGame,
  gamesByLeague,
  onGamePress,
  onPickPress,
  onSetFeatured,
}: Props) {
  const bestPicksFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (forYouPicks.length > 0) {
      Animated.timing(bestPicksFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      bestPicksFade.setValue(0);
    }
  }, [forYouPicks.length, bestPicksFade]);

  return (
    <>
      <HomeGamesErrorBanner
        loadError={loadError}
        cachedAt={cachedAt}
        upcomingCount={upcomingGames.length}
        onRetry={onRetryGames}
      />
      <HomeForYouSection
        navigation={navigation}
        forYouPicks={forYouPicks}
        forYouLoading={forYouLoading}
        forYouError={forYouError}
        onRetryForYou={onRetryForYou}
        onPickPress={onPickPress}
        onSetFeatured={onSetFeatured}
        bestPicksFade={bestPicksFade}
      />
      <HomeTrendingSection
        trendingPicks={trendingPicks}
        trendingLoading={trendingLoading}
        trendingError={trendingError}
        onRetryTrending={onRetryTrending}
        onPickPress={onPickPress}
      />
      {liveGames.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>IN-PLAY</Text>
          <View style={styles.sectionHeader}>
            <Animated.View style={[styles.liveIndicator, { opacity: liveDotOpacity }]} />
            <Text style={styles.sectionTitle}>Live Now</Text>
          </View>
          {liveGames.slice(0, 3).map((game) => (
            <TouchableOpacity key={game.id} onPress={() => onGamePress(game.id)}>
              <GameCard game={game} />
            </TouchableOpacity>
          ))}
          {adEngine.initialized ? (
            <NativeFeedAdCard surface="home" screenLabel="Home_InPlay_Rail" />
          ) : null}
        </View>
      ) : null}
      {featuredGame ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AI PICK</Text>
          <View style={styles.featuredBadgeWrap}>
            <View style={styles.featuredBadge}>
              <Ionicons name="sparkles" size={14} color={theme.colors.accent} />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
            <Text style={styles.sectionTitle}>Featured Game</Text>
          </View>
          <TouchableOpacity onPress={() => onGamePress(featuredGame.id)} activeOpacity={0.9}>
            <View style={styles.featuredCard}>
              <GameCard game={featuredGame} />
              {featuredGame.prediction ? (
                <View style={styles.featuredPrediction}>
                  <PredictionCard
                    prediction={featuredGame.prediction}
                    league={featuredGame.league}
                  />
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
          {featuredGame.prediction ? (
            <TouchableOpacity style={styles.whyPickButton} onPress={() => onGamePress(featuredGame.id)}>
              <Ionicons name="document-text-outline" size={16} color={theme.colors.accent} />
              <Text style={styles.whyPickText}>View analysis</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {isAuthenticated && hasProAccess(subscriptionTier) && challengeCount > 0 ? (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.challengeCTA}
            onPress={() => navigation.navigate('Challenges')}
            activeOpacity={0.9}
          >
            <Ionicons name="trophy" size={24} color={theme.colors.accent} />
            <View style={styles.challengeCTAText}>
              <Text style={styles.challengeCTATitle}>
                {`You have ${challengeCount} challenge${challengeCount === 1 ? '' : 's'}`}
              </Text>
              <Text style={styles.challengeCTASub}>View your challenges</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}
      {isAuthenticated &&
      subscriptionTier !== 'premium' &&
      subscriptionTier !== 'premium_plus' &&
      !premiumTeaserDismissed ? (
        <View style={styles.section}>
          <View style={styles.premiumTeaser}>
            <TouchableOpacity
              style={styles.premiumTeaserDismiss}
              onPress={onDismissPremiumTeaser}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.premiumTeaserTitle}>Live picks & full analysis</Text>
            <Text style={styles.premiumTeaserSub}>
              {PREMIUM_TRIAL_DAYS}-day free trial · cancel anytime in Settings
            </Text>
            <TouchableOpacity
              style={styles.premiumTeaserButton}
              onPress={() =>
                navigation.navigate('Paywall', {
                  emphasizeTier: 'premium',
                  contextMessage: PREMIUM_PAYWALL_CONTEXT,
                })
              }
              activeOpacity={0.9}
            >
              <Text style={styles.premiumTeaserButtonText}>Try free</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {Object.entries(gamesByLeague)
        .sort(([a], [b]) => compareLeagueDisplayOrder(a, b))
        .map(([league, games], sectionIndex) => {
          if (games.length === 0 || games[0]?.id === featuredGame?.id) return null;
          const leagueLabel = formatLeagueLabel(league);
          const spacing = adEngine.initialized ? adEngine.spacingForHome() : 4;
          const showMidRail =
            adEngine.initialized && sectionIndex > 0 && (sectionIndex + 1) % spacing === 0;
          return (
            <View key={league} style={styles.section}>
              <Text style={styles.sectionLabel}>{leagueLabel.toUpperCase()}</Text>
              <View style={styles.sectionHeader}>
                <Ionicons name={getSportIcon(league)} size={20} color={theme.colors.accent} />
                <Text style={styles.sectionTitle}>{leagueLabel}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const hub =
                      league === 'nfl' || league === 'nba'
                        ? league
                        : isSoccerLeague(league)
                          ? 'soccer'
                          : league;
                    navigation.navigate('Games', { league: hub });
                  }}
                  style={styles.seeAllButton}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              {games.slice(0, 3).map((game) => (
                <TouchableOpacity key={game.id} onPress={() => onGamePress(game.id)}>
                  <GameCard game={game} />
                </TouchableOpacity>
              ))}
              {showMidRail ? (
                <NativeFeedAdCard surface="home" screenLabel={`Home_${league}_Rail`} />
              ) : null}
            </View>
          );
        })}
      {loading && upcomingGames.length === 0 ? (
        <FeedSkeleton count={3} variant="card" />
      ) : null}
      {!loading && upcomingGames.length === 0 && !loadError ? (
        <FeedEmptyState
          icon="calendar-outline"
          title="No upcoming games"
          subtitle="Pull to refresh or browse by sport in the Games tab."
          actionLabel="Browse games"
          onAction={() => navigation.navigate('Games')}
        />
      ) : null}
      <PredictionDisclaimer compact style={styles.homeDisclaimer} />
    </>
  );
}

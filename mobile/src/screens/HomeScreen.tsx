import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SportIconsRow } from '../components/SportIconsRow';
import { SoccerBetaNotice } from '../components/SoccerBetaNotice';
import { ModelWarmingNotice } from '../components/ModelWarmingNotice';
import { useAppSelector } from '../store/hooks';
import { theme } from '../constants/theme';
import { useIntervalWhen } from '../hooks/useIntervalWhen';
import { useLayout } from '../hooks/useLayout';
import { useAdEngine } from '../ads/engine/AdEngineContext';
import { BannerStrip } from '../ads/components/BannerStrip';
import type { BestPickItem } from '../components/BestPickMiniCard';
import { HomeHeader } from './home/HomeHeader';
import {
  ActivationScorecardNudge,
  HomeGuestBanner,
  HomeHeroStrip,
  HomeStatsWidget,
} from './home/HomeHeroSections';
import { HomeFeedSections } from './home/HomeFeedSections';
import { useHomeScreenData } from './home/useHomeScreenData';
import { LIVE_GAMES_POLL_MS, type HomeScreenNavigationProp } from './home/homeScreenUtils';
import { homeScreenStyles as styles } from './home/homeScreenStyles';
import {
  getScorecardNudgePending,
  markActivationComplete,
  setScorecardNudgePending,
} from '../utils/activationStorage';
import {
  trackFirstPredictionOpened,
  trackScorecardOpened,
  trackActivationCompleted,
} from '../services/productAnalytics';

export const HomeScreen: React.FC = () => {
  const adEngine = useAdEngine();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { isWide, contentMaxWidth, horizontalPadding } = useLayout();
  const contentStyle = useMemo(
    () => (isWide ? { width: contentMaxWidth, alignSelf: 'center' as const } : undefined),
    [isWide, contentMaxWidth],
  );
  const scrollRef = useRef<ScrollView>(null);
  const forYouYRef = useRef(0);
  const [showScorecardNudge, setShowScorecardNudge] = useState(false);

  const {
    upcomingGames,
    cachedAt,
    loading,
    loadError,
    refreshing,
    onRefresh,
    forYouPicks,
    forYouLoading,
    forYouError,
    loadForYou,
    accuracyPct,
    subscriptionTier,
    challengeCount,
    premiumTeaserDismissed,
    setPremiumTeaserDismissed,
    trendingPicks,
    trendingLoading,
    trendingError,
    loadTrending,
    favoritesCount,
    setSelectedFeaturedId,
    gamesByLeague,
    featuredGame,
    liveGames,
    refetchGames,
  } = useHomeScreenData(isAuthenticated);

  useIntervalWhen(liveGames.length > 0, LIVE_GAMES_POLL_MS, () => {
    void refetchGames();
  });

  const liveDotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (liveGames.length === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(liveDotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [liveGames.length, liveDotOpacity]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowScorecardNudge(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const pending = await getScorecardNudgePending();
      if (!cancelled) setShowScorecardNudge(pending);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleGamePress = useCallback(
    (gameId: string) => {
      navigation.navigate('GameDetail', { gameId });
    },
    [navigation],
  );

  const handlePickPress = (pick: BestPickItem) => {
    if (pick.guest_locked) {
      navigation.navigate('Register');
      return;
    }
    void trackFirstPredictionOpened(
      pick.id,
      isAuthenticated ? 'auth' : 'guest',
      'home_feed',
    );
    handleGamePress(pick.id);
  };

  const handleSportPress = (sportId: string) => {
    navigation.navigate('Games', { league: sportId });
  };

  const scrollToFreePicks = useCallback(() => {
    const unlocked = forYouPicks.find((p) => !p.guest_locked);
    if (unlocked) {
      void trackFirstPredictionOpened(unlocked.id, 'guest', 'home_banner');
      handleGamePress(unlocked.id);
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, forYouYRef.current - 24), animated: true });
  }, [forYouPicks, handleGamePress]);

  const openScorecardNudge = useCallback(() => {
    void trackScorecardOpened('onboarding_nudge');
    void markActivationComplete();
    void trackActivationCompleted();
    setShowScorecardNudge(false);
    navigation.navigate('Accuracy');
  }, [navigation]);

  const dismissScorecardNudge = useCallback(() => {
    void setScorecardNudgePending(false);
    setShowScorecardNudge(false);
  }, []);

  return (
    <View style={styles.wrapper} testID="home-screen">
      <HomeHeader cachedAt={cachedAt} loadError={loadError} />
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          isWide && { paddingHorizontal: horizontalPadding },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={contentStyle}>
          <HomeHeroStrip
            navigation={navigation}
            isAuthenticated={isAuthenticated}
            userEmail={user?.email}
            forYouCount={forYouPicks.length}
            accuracyPct={accuracyPct}
          />
          <SoccerBetaNotice />
          <ModelWarmingNotice />
          {!isAuthenticated ? (
            <HomeGuestBanner navigation={navigation} onSeeFreePick={scrollToFreePicks} />
          ) : null}
          {isAuthenticated && showScorecardNudge ? (
            <ActivationScorecardNudge
              onOpen={openScorecardNudge}
              onDismiss={dismissScorecardNudge}
            />
          ) : null}
          {isAuthenticated ? (
            <HomeStatsWidget
              navigation={navigation}
              accuracyPct={accuracyPct}
              favoritesCount={favoritesCount}
            />
          ) : null}
          <SportIconsRow onSportPress={handleSportPress} />
          <View
            onLayout={(e) => {
              forYouYRef.current = e.nativeEvent.layout.y;
            }}
            testID="home-for-you-anchor"
          >
            <HomeFeedSections
              navigation={navigation}
              adEngine={adEngine}
              isAuthenticated={isAuthenticated}
              subscriptionTier={subscriptionTier}
              challengeCount={challengeCount}
              premiumTeaserDismissed={premiumTeaserDismissed}
              onDismissPremiumTeaser={() => setPremiumTeaserDismissed(true)}
              loadError={loadError}
              cachedAt={cachedAt}
              upcomingGames={upcomingGames}
              loading={loading}
              forYouPicks={forYouPicks}
              forYouLoading={forYouLoading}
              forYouError={forYouError}
              onRetryForYou={() => void loadForYou()}
              onRetryGames={() => void refetchGames()}
              trendingPicks={trendingPicks}
              trendingLoading={trendingLoading}
              trendingError={trendingError}
              onRetryTrending={() => void loadTrending()}
              liveGames={liveGames}
              liveDotOpacity={liveDotOpacity}
              featuredGame={featuredGame}
              gamesByLeague={gamesByLeague}
              onGamePress={handleGamePress}
              onPickPress={handlePickPress}
              onSetFeatured={setSelectedFeaturedId}
            />
          </View>
          {adEngine.initialized ? (
            <View style={styles.homeBannerDock}>
              <BannerStrip screen="HomeBanner" />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

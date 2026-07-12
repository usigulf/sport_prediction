import React, { useEffect, useRef, useMemo } from 'react';
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
import { HomeGuestBanner, HomeHeroStrip, HomeStatsWidget } from './home/HomeHeroSections';
import { HomeFeedSections } from './home/HomeFeedSections';
import { useHomeScreenData } from './home/useHomeScreenData';
import { LIVE_GAMES_POLL_MS, type HomeScreenNavigationProp } from './home/homeScreenUtils';
import { homeScreenStyles as styles } from './home/homeScreenStyles';

export const HomeScreen: React.FC = () => {
  const adEngine = useAdEngine();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { isWide, contentMaxWidth, horizontalPadding } = useLayout();
  const contentStyle = useMemo(
    () => (isWide ? { width: contentMaxWidth, alignSelf: 'center' as const } : undefined),
    [isWide, contentMaxWidth],
  );

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
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [liveGames.length, liveDotOpacity]);

  const handleGamePress = (gameId: string) => {
    navigation.navigate('GameDetail', { gameId });
  };

  const handlePickPress = (pick: BestPickItem) => {
    if (pick.guest_locked) {
      navigation.navigate('Register');
      return;
    }
    handleGamePress(pick.id);
  };

  const handleSportPress = (sportId: string) => {
    navigation.navigate('Games', { league: sportId });
  };

  return (
    <View style={styles.wrapper} testID="home-screen">
      <HomeHeader cachedAt={cachedAt} loadError={loadError} />
      <ScrollView
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
        {!isAuthenticated ? <HomeGuestBanner navigation={navigation} /> : null}
        {isAuthenticated ? (
          <HomeStatsWidget
            navigation={navigation}
            accuracyPct={accuracyPct}
            favoritesCount={favoritesCount}
          />
        ) : null}
        <SportIconsRow onSportPress={handleSportPress} />
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

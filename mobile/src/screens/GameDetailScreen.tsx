import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FeedSkeleton } from '../components/feed/FeedSkeleton';
import { BannerStrip } from '../ads/components/BannerStrip';
import { useGameExitInterstitial } from '../ads/hooks/useGameExitInterstitial';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGameDetailData } from '../hooks/useGameDetailData';
import { GameDetailHeader } from './gameDetail/GameDetailHeader';
import { GameDetailMatchup } from './gameDetail/GameDetailMatchup';
import { GameDetailPredictionSection } from './gameDetail/GameDetailPredictionSection';
import { GameDetailLiveSection } from './gameDetail/GameDetailLiveSection';
import { GameDetailPlayerPropsSection } from './gameDetail/GameDetailPlayerPropsSection';
import { GameDetailGameInfo } from './gameDetail/GameDetailGameInfo';
import { gameDetailStyles as s } from './gameDetail/gameDetailStyles';

export type { PlayerPropItem } from './gameDetail/types';

export const GameDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { gameId } = route.params as { gameId: string };

  useGameExitInterstitial(navigation);

  const data = useGameDetailData(gameId, navigation);
  const {
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
  } = data;

  if (loading && !currentGame) {
    return (
      <View style={s.centerContainer}>
        <FeedSkeleton count={4} variant="card" />
      </View>
    );
  }

  if (!currentGame) {
    return (
      <View style={s.centerContainer}>
        <Text style={s.errorText}>Game not found</Text>
      </View>
    );
  }

  const homeName = currentGame.home_team?.name ?? 'Home';
  const awayName = currentGame.away_team?.name ?? 'Away';

  return (
    <View style={s.screenRoot}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 72 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <GameDetailHeader game={currentGame} homeName={homeName} awayName={awayName} />
        <GameDetailMatchup
          game={currentGame}
          homeName={homeName}
          awayName={awayName}
          favoriteTeamIds={favoriteTeamIds}
          addingTeamId={addingTeamId}
          onAddFavorite={addTeamToFavorites}
        />
        <GameDetailPredictionSection
          gameId={gameId}
          game={currentGame}
          homeName={homeName}
          awayName={awayName}
          currentPrediction={currentPrediction}
          loadingPrediction={loadingPrediction}
          gamesError={gamesError}
          isAuthenticated={isAuthenticated}
          isPremium={isPremium}
          advancedLockedFree={advancedLockedFree}
          showExplanation={showExplanation}
          setShowExplanation={setShowExplanation}
          oddsDisplayEnabled={oddsDisplayEnabled}
          marketOdds={marketOdds}
          authUserId={authUser?.id}
          lastUpdatePredictionAt={lastUpdate?.prediction_updated_at}
          onShare={handleShare}
          navigation={navigation}
        />
        {isPremium ? (
          <GameDetailLiveSection
            game={currentGame}
            lastUpdate={lastUpdate}
            connected={connected}
            liveError={liveError}
          />
        ) : null}
        {playerPropsEnabled ? (
          <GameDetailPlayerPropsSection
            isPremium={isPremium}
            playerPropsNamed={playerPropsNamed}
            playerPropsDisclaimer={playerPropsDisclaimer}
            playerPropsLoading={playerPropsLoading}
            playerPropsError={playerPropsError}
            playerProps={playerProps}
            navigation={navigation}
          />
        ) : null}
        <GameDetailGameInfo game={currentGame} />
      </ScrollView>
      <View style={[s.bannerDock, { paddingBottom: insets.bottom }]}>
        <BannerStrip screen="GameDetail" />
      </View>
    </View>
  );
};

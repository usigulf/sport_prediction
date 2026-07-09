import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PredictionCard } from '../../components/PredictionCard';
import { MarketOddsCard } from '../../components/MarketOddsCard';
import { ExplanationView } from '../../components/ExplanationView';
import { GuestSignupCard } from '../../components/GuestSignupCard';
import { SharePickCard, buildSharePickCardData } from '../../components/SharePickCard';
import { PredictionDisclaimer } from '../../components/PredictionDisclaimer';
import { NativeFeedAdCard } from '../../ads/components/NativeFeedAdCard';
import { RewardedUnlockCTA } from '../../ads/components/RewardedUnlockCTA';
import { getUserFriendlyMessage } from '../../utils/errorMessages';
import type { MarketOddsResponse } from '../../services/api';
import type { Game, Prediction } from '../../types';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../constants/theme';
import { gameDetailStyles as s } from './gameDetailStyles';

type Nav = StackNavigationProp<RootStackParamList>;

type Props = {
  gameId: string;
  game: Game;
  homeName: string;
  awayName: string;
  currentPrediction: Prediction | null;
  loadingPrediction: boolean;
  gamesError: string | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  advancedLockedFree: boolean;
  showExplanation: boolean;
  setShowExplanation: (v: boolean) => void;
  oddsDisplayEnabled: boolean;
  marketOdds: MarketOddsResponse | null;
  authUserId?: string;
  lastUpdatePredictionAt?: string | null;
  onShare: () => void;
  navigation: Nav;
};

export function GameDetailPredictionSection({
  gameId,
  game,
  homeName,
  awayName,
  currentPrediction,
  loadingPrediction,
  gamesError,
  isAuthenticated,
  isPremium,
  advancedLockedFree,
  showExplanation,
  setShowExplanation,
  oddsDisplayEnabled,
  marketOdds,
  authUserId,
  lastUpdatePredictionAt,
  onShare,
  navigation,
}: Props) {
  return (
    <View style={s.predictionSection}>
      {loadingPrediction ? (
        <View style={s.predictionPlaceholder}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={s.mutedText}>Loading prediction...</Text>
        </View>
      ) : currentPrediction ? (
        <>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowExplanation(!showExplanation)}
            style={s.predictionTapArea}
          >
            <PredictionCard
              prediction={currentPrediction}
              embedded
              league={game.league}
              homeTeamName={homeName}
              awayTeamName={awayName}
              advancedInsightsLocked={advancedLockedFree}
            />
            <View style={s.whyButton}>
              <Text style={s.whyButtonText}>
                {showExplanation ? 'Hide analysis' : 'Show analysis'}
              </Text>
              <Text style={s.whyButtonSubtext}>
                Live context, standings, H2H, metrics & scenarios
              </Text>
            </View>
          </TouchableOpacity>
          <SharePickCard
            card={buildSharePickCardData({
              homeName,
              awayName,
              league: game.league,
              prediction: currentPrediction,
              userId: authUserId,
              pickDetailsLocked: advancedLockedFree,
            })}
            pickDetailsLocked={advancedLockedFree}
          />
          <TouchableOpacity style={s.shareButton} onPress={onShare}>
            <Text style={s.shareButtonText}>Share this pick</Text>
          </TouchableOpacity>
          {oddsDisplayEnabled && marketOdds?.available ? (
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
                /* state from context */
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
              analysisRefreshToken={isPremium ? lastUpdatePredictionAt ?? null : null}
              league={game.league}
              homeWinProbability={currentPrediction.home_win_probability}
              awayWinProbability={currentPrediction.away_win_probability}
            />
          ) : null}
          <PredictionDisclaimer league={game.league} compact style={{ marginHorizontal: 16 }} />
        </>
      ) : !isAuthenticated ? (
        <GuestSignupCard
          title="Sign up to see this pick"
          message="Create a free account to view win probabilities, full analysis, favorites, and live updates for every game."
        />
      ) : (
        <View style={s.predictionPlaceholder}>
          {gamesError && /daily prediction limit/i.test(gamesError) ? (
            <>
              <Text style={s.mutedText}>{getUserFriendlyMessage(gamesError)}</Text>
              <TouchableOpacity
                style={s.upgradeButton}
                onPress={() =>
                  navigation.navigate('Paywall', {
                    emphasizeTier: 'premium',
                    contextMessage: 'Premium unlocks unlimited daily predictions.',
                  })
                }
              >
                <Text style={s.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={s.mutedText}>
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
  );
}

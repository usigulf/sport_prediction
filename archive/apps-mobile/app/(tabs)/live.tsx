import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { useWebSocket } from '@/providers/WebSocketProvider';
import { predictionsApi } from '@/services/api/predictions';
import type { GamePrediction, LivePrediction } from '@/types/predictions';

export default function LiveScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [livePredictions, setLivePredictions] = useState<Map<string, LivePrediction>>(new Map());
  const { subscribe, unsubscribe, onLivePrediction, isConnected } = useWebSocket();

  const { data: games, isLoading, refetch } = useQuery({
    queryKey: ['predictions', 'live'],
    queryFn: async () => {
      const today = await predictionsApi.getTodaysPredictions();
      return today.filter((g) => g.status === 'live');
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Subscribe to live updates for all live games
  useEffect(() => {
    if (games) {
      games.forEach((game) => subscribe(game.gameId));
    }
    return () => {
      games?.forEach((game) => unsubscribe(game.gameId));
    };
  }, [games, subscribe, unsubscribe]);

  // Handle live prediction updates
  useEffect(() => {
    const cleanup = onLivePrediction((prediction) => {
      setLivePredictions((prev) => new Map(prev).set(prediction.gameId, prediction));
    });
    return cleanup;
  }, [onLivePrediction]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      className="flex-1 bg-dark-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
      }
    >
      {/* Connection Status */}
      <View className="flex-row items-center justify-center py-2 border-b border-dark-800">
        <View className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <Text className="text-xs text-dark-400">
          {isConnected ? 'Live updates connected' : 'Connecting...'}
        </Text>
      </View>

      {/* Live Games */}
      <View className="px-4 py-4">
        {isLoading ? (
          <View>
            {[1, 2, 3].map((i) => (
              <View key={i} className="h-40 mb-4 rounded-xl bg-dark-800 animate-pulse" />
            ))}
          </View>
        ) : games && games.length > 0 ? (
          games.map((game) => (
            <LiveGameCard
              key={game.id}
              game={game}
              liveData={livePredictions.get(game.gameId)}
              onPress={() => router.push(`/game/${game.gameId}`)}
            />
          ))
        ) : (
          <View className="py-16 items-center">
            <Text className="text-xl font-semibold text-white mb-2">No Live Games</Text>
            <Text className="text-dark-400 text-center">
              Check back when games are in progress{'\n'}for real-time predictions.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

interface LiveGameCardProps {
  game: GamePrediction;
  liveData?: LivePrediction;
  onPress: () => void;
}

function LiveGameCard({ game, liveData, onPress }: LiveGameCardProps) {
  const { homeTeam, awayTeam, sport } = game;

  const currentScore = liveData?.currentScore;
  const winProb = liveData?.winProbability;
  const momentum = liveData?.momentum;

  return (
    <Pressable
      onPress={onPress}
      className="mb-4 rounded-xl bg-dark-800 border border-red-900/50 overflow-hidden"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-red-900/20">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
          <Text className="text-xs font-medium text-red-400">LIVE</Text>
        </View>
        <Text className="text-xs text-dark-400">{sport.toUpperCase()}</Text>
      </View>

      {/* Scoreboard */}
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-4">
          {/* Away Team */}
          <View className="flex-1 items-center">
            <Text className="text-lg font-bold text-white">{awayTeam.abbreviation}</Text>
            <Text className="text-3xl font-bold text-white mt-1">
              {currentScore?.away ?? '-'}
            </Text>
          </View>

          {/* Center Info */}
          <View className="px-4 items-center">
            <Text className="text-xs text-dark-400">
              {currentScore?.period || 'Q1'}
            </Text>
            <Text className="text-lg font-mono text-white">
              {currentScore?.clock || '--:--'}
            </Text>
          </View>

          {/* Home Team */}
          <View className="flex-1 items-center">
            <Text className="text-lg font-bold text-white">{homeTeam.abbreviation}</Text>
            <Text className="text-3xl font-bold text-white mt-1">
              {currentScore?.home ?? '-'}
            </Text>
          </View>
        </View>

        {/* Win Probability Bar */}
        {winProb && (
          <View className="mb-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-dark-400">
                {awayTeam.abbreviation} {Math.round(winProb.away * 100)}%
              </Text>
              <Text className="text-xs text-dark-400">
                {Math.round(winProb.home * 100)}% {homeTeam.abbreviation}
              </Text>
            </View>
            <View className="h-2 rounded-full bg-dark-700 overflow-hidden flex-row">
              <View
                className="h-full bg-blue-500"
                style={{ width: `${winProb.away * 100}%` }}
              />
              <View
                className="h-full bg-emerald-500"
                style={{ width: `${winProb.home * 100}%` }}
              />
            </View>
          </View>
        )}

        {/* Momentum Indicator */}
        {momentum && momentum.team !== 'neutral' && (
          <View className="flex-row items-center justify-center py-2 rounded bg-dark-700">
            <Text className="text-xs text-dark-400 mr-1">Momentum:</Text>
            <Text className={`text-xs font-medium ${momentum.team === 'home' ? 'text-emerald-400' : 'text-blue-400'}`}>
              {momentum.team === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}
            </Text>
            <Text className="text-xs text-dark-500 ml-1">
              (+{momentum.score.toFixed(1)})
            </Text>
          </View>
        )}

        {/* Live Edge */}
        {liveData?.liveSpread && (
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-dark-700">
            <View>
              <Text className="text-xs text-dark-400">Live Line</Text>
              <Text className="text-sm text-white">
                {homeTeam.abbreviation} {liveData.liveSpread.line > 0 ? '+' : ''}{liveData.liveSpread.line}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-dark-400">Model Fair Line</Text>
              <Text className="text-sm text-white">
                {liveData.liveSpread.modelFairLine > 0 ? '+' : ''}{liveData.liveSpread.modelFairLine}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-dark-400">Edge</Text>
              <Text className={`text-sm font-medium ${liveData.liveSpread.edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {liveData.liveSpread.edge > 0 ? '+' : ''}{liveData.liveSpread.edge.toFixed(1)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

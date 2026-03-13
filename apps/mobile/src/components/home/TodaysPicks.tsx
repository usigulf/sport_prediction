import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { GamePrediction } from '@/types/predictions';

interface TodaysPicksProps {
  predictions: GamePrediction[];
  isLoading: boolean;
  isPro: boolean;
}

export function TodaysPicks({ predictions, isLoading, isPro }: TodaysPicksProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="px-4">
        <Text className="text-lg font-semibold text-white mb-3">All Picks</Text>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="h-28 mb-3 rounded-xl bg-dark-800 animate-pulse" />
        ))}
      </View>
    );
  }

  if (predictions.length === 0) {
    return (
      <View className="px-4 py-8 items-center">
        <Text className="text-dark-400 text-center">
          No games scheduled for today.
        </Text>
        <Text className="text-dark-500 text-sm text-center mt-1">
          Check back later for upcoming predictions.
        </Text>
      </View>
    );
  }

  // Group by sport
  const grouped = predictions.reduce((acc, pred) => {
    const sport = pred.sport.toUpperCase();
    if (!acc[sport]) acc[sport] = [];
    acc[sport].push(pred);
    return acc;
  }, {} as Record<string, GamePrediction[]>);

  return (
    <View className="px-4">
      <Text className="text-lg font-semibold text-white mb-3">All Picks</Text>
      {Object.entries(grouped).map(([sport, games]) => (
        <View key={sport} className="mb-4">
          <Text className="text-sm font-medium text-dark-400 mb-2">{sport}</Text>
          {games.map((prediction, index) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onPress={() => router.push(`/game/${prediction.gameId}`)}
              isPro={isPro}
              isLocked={!isPro && index >= 3}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

interface PredictionCardProps {
  prediction: GamePrediction;
  onPress: () => void;
  isPro: boolean;
  isLocked: boolean;
}

function PredictionCard({ prediction, onPress, isPro, isLocked }: PredictionCardProps) {
  const { homeTeam, awayTeam, predictions: preds, startTime, status } = prediction;
  const spreadPick = preds.spread;
  const totalPick = preds.total;
  const confidence = Math.round(spreadPick.confidence * 100);

  const gameTime = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const getConfidenceColor = (conf: number) => {
    if (conf >= 65) return 'text-emerald-400';
    if (conf >= 55) return 'text-yellow-400';
    return 'text-dark-400';
  };

  const getStatusBadge = () => {
    if (status === 'live') {
      return (
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-red-500 mr-1" />
          <Text className="text-xs font-medium text-red-400">LIVE</Text>
        </View>
      );
    }
    return <Text className="text-xs text-dark-400">{gameTime}</Text>;
  };

  if (isLocked) {
    return (
      <Pressable
        onPress={() => {/* Navigate to upgrade */}}
        className="mb-3 rounded-xl bg-dark-800/50 border border-dark-700 p-4 relative overflow-hidden"
      >
        <View className="opacity-30">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base text-white">{awayTeam.abbreviation} @ {homeTeam.abbreviation}</Text>
          </View>
        </View>
        <View className="absolute inset-0 items-center justify-center bg-dark-900/60">
          <View className="bg-dark-700 px-4 py-2 rounded-lg">
            <Text className="text-sm font-medium text-white">Upgrade to Pro</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-xl bg-dark-800 border border-dark-700 p-4"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          {getStatusBadge()}
        </View>
        <View className={`px-2 py-1 rounded ${confidence >= 60 ? 'bg-emerald-600/20' : 'bg-dark-700'}`}>
          <Text className={`text-xs font-medium ${getConfidenceColor(confidence)}`}>
            {confidence}%
          </Text>
        </View>
      </View>

      {/* Teams */}
      <View className="flex-row items-center mb-3">
        <View className="flex-1">
          <Text className={`text-base font-medium ${spreadPick.pick === 'away' ? 'text-emerald-400' : 'text-white'}`}>
            {awayTeam.name}
          </Text>
          <Text className={`text-base font-medium ${spreadPick.pick === 'home' ? 'text-emerald-400' : 'text-white'}`}>
            @ {homeTeam.name}
          </Text>
        </View>
      </View>

      {/* Predictions Row */}
      <View className="flex-row border-t border-dark-700 pt-3">
        {/* Spread */}
        <View className="flex-1 border-r border-dark-700 pr-3">
          <Text className="text-xs text-dark-400 mb-1">Spread</Text>
          <Text className="text-sm font-medium text-white">
            {spreadPick.pick === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}{' '}
            {spreadPick.spread > 0 ? '+' : ''}{spreadPick.spread}
          </Text>
        </View>

        {/* Total */}
        <View className="flex-1 px-3 border-r border-dark-700">
          <Text className="text-xs text-dark-400 mb-1">Total</Text>
          <Text className="text-sm font-medium text-white">
            {totalPick.pick.charAt(0).toUpperCase() + totalPick.pick.slice(1)} {totalPick.line}
          </Text>
        </View>

        {/* Edge */}
        <View className="flex-1 pl-3">
          <Text className="text-xs text-dark-400 mb-1">Edge</Text>
          <Text className={`text-sm font-medium ${spreadPick.edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {spreadPick.edge > 0 ? '+' : ''}{spreadPick.edge.toFixed(1)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

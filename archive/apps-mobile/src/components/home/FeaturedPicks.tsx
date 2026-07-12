import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { GamePrediction } from '@/types/predictions';

interface FeaturedPicksProps {
  predictions: GamePrediction[];
  isLoading: boolean;
}

export function FeaturedPicks({ predictions, isLoading }: FeaturedPicksProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="mb-6">
        <Text className="px-4 text-lg font-semibold text-white mb-3">
          High Confidence Picks
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        >
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              className="w-72 h-40 rounded-xl bg-dark-800 animate-pulse"
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (predictions.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <Text className="px-4 text-lg font-semibold text-white mb-3">
        High Confidence Picks
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {predictions.slice(0, 5).map((prediction) => (
          <FeaturedCard
            key={prediction.id}
            prediction={prediction}
            onPress={() => router.push(`/game/${prediction.gameId}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface FeaturedCardProps {
  prediction: GamePrediction;
  onPress: () => void;
}

function FeaturedCard({ prediction, onPress }: FeaturedCardProps) {
  const { homeTeam, awayTeam, predictions: preds, sport, startTime } = prediction;
  const spreadPick = preds.spread;
  const confidence = Math.round(spreadPick.confidence * 100);
  const pickTeam = spreadPick.pick === 'home' ? homeTeam : awayTeam;
  const spread = spreadPick.spread;

  const gameTime = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={onPress}
      className="w-72 rounded-xl bg-gradient-to-br from-emerald-900/40 to-dark-800 border border-emerald-700/30 p-4"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="bg-dark-700 px-2 py-1 rounded">
            <Text className="text-xs font-medium text-dark-300">
              {sport.toUpperCase()}
            </Text>
          </View>
          <Text className="text-xs text-dark-400 ml-2">{gameTime}</Text>
        </View>
        <View className="bg-emerald-600/20 px-2 py-1 rounded">
          <Text className="text-xs font-bold text-emerald-400">
            {confidence}% Confidence
          </Text>
        </View>
      </View>

      {/* Teams */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text className={`text-base font-medium ${spreadPick.pick === 'away' ? 'text-emerald-400' : 'text-dark-300'}`}>
            {awayTeam.abbreviation}
          </Text>
          <Text className="text-xs text-dark-500">{awayTeam.record}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className={`text-base font-medium ${spreadPick.pick === 'home' ? 'text-emerald-400' : 'text-dark-300'}`}>
            {homeTeam.abbreviation}
          </Text>
          <Text className="text-xs text-dark-500">{homeTeam.record}</Text>
        </View>
      </View>

      {/* Pick */}
      <View className="bg-dark-900/50 rounded-lg p-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-dark-400">Spread Pick</Text>
            <Text className="text-lg font-bold text-white">
              {pickTeam.abbreviation} {spread > 0 ? '+' : ''}{spread}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-dark-400">Edge</Text>
            <Text className={`text-sm font-semibold ${spreadPick.edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {spreadPick.edge > 0 ? '+' : ''}{spreadPick.edge.toFixed(1)} pts
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

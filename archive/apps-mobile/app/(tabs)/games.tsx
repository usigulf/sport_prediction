import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { format, addDays, subDays } from 'date-fns';

import { SportFilter } from '@/components/home/SportFilter';
import { predictionsApi } from '@/services/api/predictions';
import type { GamePrediction } from '@/types/predictions';

export default function GamesScreen() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: predictions, isLoading, refetch } = useQuery({
    queryKey: ['predictions', dateStr, selectedSport],
    queryFn: () => predictionsApi.getPredictionsByDate(dateStr, selectedSport || undefined),
    staleTime: 1000 * 60 * 5,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const navigateDate = (days: number) => {
    setSelectedDate((prev) => days > 0 ? addDays(prev, days) : subDays(prev, Math.abs(days)));
  };

  return (
    <ScrollView
      className="flex-1 bg-dark-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
      }
    >
      {/* Date Selector */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-800">
        <Pressable onPress={() => navigateDate(-1)} className="p-2">
          <Text className="text-emerald-400 text-lg">{'<'}</Text>
        </Pressable>
        <View className="items-center">
          <Text className="text-white font-semibold">
            {format(selectedDate, 'EEEE, MMM d')}
          </Text>
          {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
            <Text className="text-xs text-emerald-400">Today</Text>
          )}
        </View>
        <Pressable onPress={() => navigateDate(1)} className="p-2">
          <Text className="text-emerald-400 text-lg">{'>'}</Text>
        </Pressable>
      </View>

      {/* Sport Filter */}
      <View className="py-3">
        <SportFilter selectedSport={selectedSport} onSelectSport={setSelectedSport} />
      </View>

      {/* Games List */}
      <View className="px-4">
        {isLoading ? (
          <View>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} className="h-24 mb-3 rounded-xl bg-dark-800 animate-pulse" />
            ))}
          </View>
        ) : predictions && predictions.length > 0 ? (
          predictions.map((prediction) => (
            <GameCard
              key={prediction.id}
              prediction={prediction}
              onPress={() => router.push(`/game/${prediction.gameId}`)}
            />
          ))
        ) : (
          <View className="py-12 items-center">
            <Text className="text-dark-400">No games scheduled for this date.</Text>
          </View>
        )}
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}

interface GameCardProps {
  prediction: GamePrediction;
  onPress: () => void;
}

function GameCard({ prediction, onPress }: GameCardProps) {
  const { homeTeam, awayTeam, predictions: preds, startTime, status, sport } = prediction;
  const spreadPick = preds.spread;

  const gameTime = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-xl bg-dark-800 border border-dark-700 p-4"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="bg-dark-700 px-2 py-1 rounded mr-2">
            <Text className="text-xs text-dark-300">{sport.toUpperCase()}</Text>
          </View>
          {status === 'live' ? (
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-red-500 mr-1" />
              <Text className="text-xs text-red-400">LIVE</Text>
            </View>
          ) : (
            <Text className="text-xs text-dark-400">{gameTime}</Text>
          )}
        </View>
        <Text className="text-xs text-emerald-400">
          {Math.round(spreadPick.confidence * 100)}% conf
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white font-medium">{awayTeam.name}</Text>
          <Text className="text-white font-medium">@ {homeTeam.name}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-dark-400">Pick</Text>
          <Text className="text-emerald-400 font-medium">
            {spreadPick.pick === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}{' '}
            {spreadPick.spread > 0 ? '+' : ''}{spreadPick.spread}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

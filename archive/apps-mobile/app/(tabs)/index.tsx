import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { FeaturedPicks } from '@/components/home/FeaturedPicks';
import { SportFilter } from '@/components/home/SportFilter';
import { TodaysPicks } from '@/components/home/TodaysPicks';
import { AccuracyBanner } from '@/components/home/AccuracyBanner';
import { predictionsApi } from '@/services/api/predictions';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user, subscription } = useAuthStore();

  const {
    data: predictions,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['predictions', 'today', selectedSport],
    queryFn: () => predictionsApi.getTodaysPredictions(selectedSport),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      className="flex-1 bg-dark-900"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#10B981"
        />
      }
    >
      {/* Welcome Banner */}
      <View className="px-4 py-6">
        <Text className="text-2xl font-bold text-white">
          {user ? `Welcome back, ${user.profile?.displayName || 'Player'}` : 'Today\'s Picks'}
        </Text>
        <Text className="text-dark-400 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Accuracy Banner */}
      <AccuracyBanner />

      {/* Sport Filter */}
      <SportFilter
        selectedSport={selectedSport}
        onSelectSport={setSelectedSport}
      />

      {/* Featured High-Confidence Picks */}
      <FeaturedPicks
        predictions={predictions?.filter((p) => p.predictions.spread.confidence >= 0.65) || []}
        isLoading={isLoading}
      />

      {/* All Today's Picks */}
      <TodaysPicks
        predictions={predictions || []}
        isLoading={isLoading}
        isPro={subscription?.plan !== 'free'}
      />

      {/* Bottom padding */}
      <View className="h-8" />
    </ScrollView>
  );
}

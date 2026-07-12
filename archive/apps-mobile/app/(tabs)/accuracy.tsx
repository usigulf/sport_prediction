import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { predictionsApi } from '@/services/api/predictions';
import type { AccuracyStats } from '@/types/predictions';

type DateRange = '7d' | '30d' | '90d' | 'all';
type PredictionType = 'spread' | 'total' | 'moneyline';

export default function AccuracyScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedType, setSelectedType] = useState<PredictionType | null>(null);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['accuracy', dateRange, selectedType],
    queryFn: () => predictionsApi.getAccuracyStats({
      date_range: dateRange,
      prediction_type: selectedType || undefined,
    }),
    staleTime: 1000 * 60 * 15,
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
      }
    >
      {/* Date Range Selector */}
      <View className="flex-row px-4 py-3 border-b border-dark-800">
        {(['7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
          <Pressable
            key={range}
            onPress={() => setDateRange(range)}
            className={`flex-1 py-2 rounded-lg mr-2 last:mr-0 ${
              dateRange === range ? 'bg-emerald-600' : 'bg-dark-800'
            }`}
          >
            <Text className={`text-center text-sm font-medium ${
              dateRange === range ? 'text-white' : 'text-dark-400'
            }`}>
              {range === 'all' ? 'All Time' : range.replace('d', ' Days')}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View className="px-4 py-6">
          <View className="h-32 rounded-xl bg-dark-800 animate-pulse mb-4" />
          <View className="h-48 rounded-xl bg-dark-800 animate-pulse mb-4" />
          <View className="h-48 rounded-xl bg-dark-800 animate-pulse" />
        </View>
      ) : stats ? (
        <View className="px-4 py-6">
          {/* Overall Stats */}
          <OverallStatsCard stats={stats} />

          {/* By Sport */}
          <SportBreakdown stats={stats} />

          {/* By Prediction Type */}
          <TypeBreakdown
            stats={stats}
            selectedType={selectedType}
            onSelectType={setSelectedType}
          />

          {/* Calibration Chart */}
          <CalibrationCard stats={stats} />
        </View>
      ) : null}

      <View className="h-8" />
    </ScrollView>
  );
}

function OverallStatsCard({ stats }: { stats: AccuracyStats }) {
  const { winRate, totalPicks, roi } = stats.overall;

  return (
    <View className="rounded-xl bg-dark-800 p-4 mb-4">
      <Text className="text-lg font-semibold text-white mb-4">Overall Performance</Text>

      <View className="flex-row">
        <View className="flex-1 items-center">
          <Text className="text-3xl font-bold text-emerald-400">
            {(winRate * 100).toFixed(1)}%
          </Text>
          <Text className="text-xs text-dark-400 mt-1">Win Rate</Text>
        </View>

        <View className="w-px bg-dark-700" />

        <View className="flex-1 items-center">
          <Text className="text-3xl font-bold text-white">{totalPicks}</Text>
          <Text className="text-xs text-dark-400 mt-1">Total Picks</Text>
        </View>

        <View className="w-px bg-dark-700" />

        <View className="flex-1 items-center">
          <Text className={`text-3xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {roi >= 0 ? '+' : ''}{(roi * 100).toFixed(1)}%
          </Text>
          <Text className="text-xs text-dark-400 mt-1">ROI</Text>
        </View>
      </View>
    </View>
  );
}

function SportBreakdown({ stats }: { stats: AccuracyStats }) {
  return (
    <View className="rounded-xl bg-dark-800 p-4 mb-4">
      <Text className="text-lg font-semibold text-white mb-4">By Sport</Text>

      {stats.bySport.map((sport) => (
        <View key={sport.sport} className="flex-row items-center py-3 border-b border-dark-700 last:border-b-0">
          <Text className="flex-1 text-white font-medium">{sport.sport.toUpperCase()}</Text>
          <View className="flex-row items-center">
            <View className="w-20 items-end mr-4">
              <Text className={`font-semibold ${sport.winRate >= 0.52 ? 'text-emerald-400' : sport.winRate >= 0.48 ? 'text-yellow-400' : 'text-red-400'}`}>
                {(sport.winRate * 100).toFixed(1)}%
              </Text>
            </View>
            <Text className="text-dark-400 text-sm w-16 text-right">{sport.totalPicks} picks</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function TypeBreakdown({
  stats,
  selectedType,
  onSelectType,
}: {
  stats: AccuracyStats;
  selectedType: PredictionType | null;
  onSelectType: (type: PredictionType | null) => void;
}) {
  return (
    <View className="rounded-xl bg-dark-800 p-4 mb-4">
      <Text className="text-lg font-semibold text-white mb-4">By Prediction Type</Text>

      <View className="flex-row">
        {stats.byPredictionType.map((type) => {
          const isSelected = selectedType === type.type;
          return (
            <Pressable
              key={type.type}
              onPress={() => onSelectType(isSelected ? null : type.type)}
              className={`flex-1 p-3 rounded-lg mr-2 last:mr-0 ${
                isSelected ? 'bg-emerald-600/20 border border-emerald-600' : 'bg-dark-700'
              }`}
            >
              <Text className="text-center text-xs text-dark-400 capitalize">{type.type}</Text>
              <Text className={`text-center text-xl font-bold mt-1 ${
                type.winRate >= 0.52 ? 'text-emerald-400' : 'text-white'
              }`}>
                {(type.winRate * 100).toFixed(1)}%
              </Text>
              <Text className="text-center text-xs text-dark-500 mt-1">{type.totalPicks} picks</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CalibrationCard({ stats }: { stats: AccuracyStats }) {
  return (
    <View className="rounded-xl bg-dark-800 p-4">
      <Text className="text-lg font-semibold text-white mb-2">Model Calibration</Text>
      <Text className="text-xs text-dark-400 mb-4">
        How well do our confidence scores match actual outcomes?
      </Text>

      <View>
        {stats.byConfidence.map((bucket) => {
          const diff = bucket.actualRate - bucket.predictedRate;
          const isCalibrated = Math.abs(diff) <= 0.03;

          return (
            <View key={bucket.bucket} className="flex-row items-center py-2">
              <Text className="w-24 text-sm text-dark-300">{bucket.bucket}</Text>
              <View className="flex-1 mx-3">
                <View className="h-2 rounded-full bg-dark-700 relative">
                  {/* Expected */}
                  <View
                    className="absolute h-full rounded-full bg-dark-500"
                    style={{ width: `${bucket.predictedRate * 100}%` }}
                  />
                  {/* Actual */}
                  <View
                    className={`absolute h-full rounded-full ${isCalibrated ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                    style={{ width: `${bucket.actualRate * 100}%` }}
                  />
                </View>
              </View>
              <Text className="w-12 text-right text-sm text-white">
                {(bucket.actualRate * 100).toFixed(0)}%
              </Text>
              <Text className="w-16 text-right text-xs text-dark-500">
                n={bucket.sampleSize}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="flex-row mt-4 pt-3 border-t border-dark-700">
        <View className="flex-row items-center mr-4">
          <View className="w-3 h-3 rounded-full bg-dark-500 mr-1" />
          <Text className="text-xs text-dark-400">Expected</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-emerald-500 mr-1" />
          <Text className="text-xs text-dark-400">Actual</Text>
        </View>
      </View>
    </View>
  );
}

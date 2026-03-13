import { View, Text, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { predictionsApi } from '@/services/api/predictions';

export function AccuracyBanner() {
  const router = useRouter();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['accuracy', 'overall'],
    queryFn: () => predictionsApi.getAccuracyStats({ date_range: '7d' }),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  if (isLoading || !stats) {
    return (
      <View className="mx-4 mb-4 rounded-xl bg-dark-800 p-4">
        <View className="h-16 animate-pulse rounded bg-dark-700" />
      </View>
    );
  }

  const winRate = stats.overall.winRate * 100;
  const totalPicks = stats.overall.totalPicks;
  const last7 = stats.last7Days || [];
  const recentWins = last7.reduce((sum, d) => sum + d.wins, 0);
  const recentTotal = last7.reduce((sum, d) => sum + d.wins + d.losses, 0);

  return (
    <Pressable
      onPress={() => router.push('/accuracy')}
      className="mx-4 mb-4 rounded-xl bg-gradient-to-r from-emerald-900/50 to-emerald-800/30 border border-emerald-700/30 p-4"
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm text-emerald-400 font-medium">
            Model Accuracy (Last 7 Days)
          </Text>
          <View className="flex-row items-baseline mt-1">
            <Text className="text-3xl font-bold text-white">
              {winRate.toFixed(1)}%
            </Text>
            <Text className="text-dark-400 ml-2">
              ({totalPicks} picks)
            </Text>
          </View>
        </View>

        <View className="items-end">
          <View className="flex-row space-x-1">
            {last7.slice(-7).map((day, i) => {
              const total = day.wins + day.losses;
              const dayWinRate = total > 0 ? day.wins / total : 0;
              const bgColor = dayWinRate >= 0.5
                ? 'bg-emerald-500'
                : dayWinRate > 0
                  ? 'bg-red-500'
                  : 'bg-dark-600';

              return (
                <View
                  key={i}
                  className={`w-2 h-6 rounded-sm ${bgColor}`}
                  style={{ opacity: 0.5 + dayWinRate * 0.5 }}
                />
              );
            })}
          </View>
          <Text className="text-xs text-dark-400 mt-1">
            {recentWins}-{recentTotal - recentWins} this week
          </Text>
        </View>
      </View>

      <View className="flex-row mt-3 pt-3 border-t border-dark-700">
        <View className="flex-1">
          <Text className="text-xs text-dark-400">ROI</Text>
          <Text className={`text-sm font-semibold ${stats.overall.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.overall.roi >= 0 ? '+' : ''}{(stats.overall.roi * 100).toFixed(1)}%
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-dark-400">Best Sport</Text>
          <Text className="text-sm font-semibold text-white">
            {stats.bySport.length > 0
              ? stats.bySport.reduce((a, b) => a.winRate > b.winRate ? a : b).sport.toUpperCase()
              : 'N/A'}
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-xs text-dark-400">Calibration</Text>
          <Text className="text-sm font-semibold text-emerald-400">
            View Details
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Live Hub: today's games and top picks in one place. Uses /feed/top-picks and shows countdown.
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { GameCard } from '../components/GameCard';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';
import { useAdEngine } from '../ads/engine/AdEngineContext';
import { NativeFeedAdCard } from '../ads/components/NativeFeedAdCard';
import { BannerStrip } from '../ads/components/BannerStrip';
import {
  mergeListWithNativeAds,
  type MergedRow,
} from '../ads/hooks/mergeListWithNativeAds';

type LiveHubNavigationProp = StackNavigationProp<RootStackParamList>;

function formatStartsIn(scheduledTime: string): string {
  try {
    const d = new Date(scheduledTime);
    const now = new Date();
    const ms = d.getTime() - now.getTime();
    if (ms <= 0) return 'Live';
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `In ${days}d ${hours % 24}h`;
    if (hours > 0) return `In ${hours}h ${mins % 60}m`;
    if (mins >= 1) return `In ${mins}m`;
    return 'Soon';
  } catch {
    return '';
  }
}

export const LiveHubScreen: React.FC = () => {
  const navigation = useNavigation<LiveHubNavigationProp>();
  const adEngine = useAdEngine();
  const insets = useSafeAreaInsets();
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spacing = adEngine.initialized ? adEngine.spacingForLiveHub() : 6;
  const merged = useMemo(
    () =>
      mergeListWithNativeAds(
        picks,
        (item, i) => (item?.id ? String(item.id) : `p-${i}`),
        spacing,
      ),
    [picks, spacing],
  );

  const load = async () => {
    try {
      setError(null);
      const res = await apiService.getTopPicks({ limit: 30 });
      setPicks(res.picks ?? []);
    } catch (e) {
      setError(getUserFriendlyMessage(e));
      setPicks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleGamePress = (gameId: string) => {
    navigation.navigate('GameDetail', { gameId });
  };

  const renderMerged = ({
    item,
  }: {
    item: MergedRow<(typeof picks)[number]>;
  }) => {
    if (item.kind === 'ad') {
      return <NativeFeedAdCard surface="liveHub" screenLabel="LiveHub_Feed_Rail" />;
    }
    const g = item.item;
    return (
      <TouchableOpacity onPress={() => handleGamePress(g.id)}>
        <View style={styles.cardWrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatStartsIn(g.scheduled_time)}</Text>
          </View>
          <GameCard game={g} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Hub</Text>
        <Text style={styles.subtitle}>Today&apos;s best picks & upcoming games</Text>
      </View>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          style={styles.listFlex}
          data={merged}
          renderItem={renderMerged}
          keyExtractor={(row) => row.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 72 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No games today</Text>
              <Text style={styles.emptySubtext}>Check back later or browse Games tab.</Text>
            </View>
          }
        />
      )}
      <View style={[styles.bannerDock, { paddingBottom: insets.bottom }]}>
        <BannerStrip screen="LiveHubBanner" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listFlex: {
    flex: 1,
  },
  bannerDock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.backgroundElevated,
  },
  header: {
    backgroundColor: theme.colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm + 4,
    paddingBottom: theme.spacing.sm + 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: theme.spacing.sm,
  },
  cardWrap: {
    marginBottom: theme.spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: theme.colors.secondaryDim,
    padding: theme.spacing.sm + 4,
    margin: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
});

/**
 * Leaderboards: rank by prediction-view accuracy (weekly / monthly / all). Premium required.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';
import { useAppSelector } from '../store/hooks';
import { hasProAccess } from '../utils/subscription';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PremiumFeatureEmptyState } from '../components/PremiumFeatureEmptyState';

type Period = 'weekly' | 'monthly' | 'all';

interface Entry {
  rank: number;
  user_id: string;
  display_name: string;
  correct: number;
  total: number;
  accuracy_pct: number;
  is_me?: boolean;
}

type Nav = StackNavigationProp<RootStackParamList>;

export const LeaderboardsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tier = useAppSelector((s) => s.auth.user?.subscriptionTier ?? 'free');
  const pro = hasProAccess(tier);
  const [period, setPeriod] = useState<Period>('monthly');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [communityWarming, setCommunityWarming] = useState(false);
  const [minActiveUsers, setMinActiveUsers] = useState(50);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!pro) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await apiService.getLeaderboards({ period, limit: 50 });
        setEntries(res.entries ?? []);
        setCommunityWarming(Boolean(res.community_warming));
        setMinActiveUsers(res.min_active_users ?? 50);
      } catch (e) {
        setError(getUserFriendlyMessage(e));
        setEntries([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, pro],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!pro) {
    return (
      <View style={styles.container}>
        <PremiumFeatureEmptyState
          icon="podium-outline"
          badge="Premium"
          title="Leaderboard"
          message="Compare prediction accuracy with other Premium members who viewed finished games. Upgrade to unlock rankings."
          primaryLabel="View Premium"
          onPrimaryPress={() =>
            navigation.navigate('Paywall', {
              emphasizeTier: 'premium',
              contextMessage: 'Premium unlocks leaderboards and challenges.',
            })
          }
        />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Entry }) => (
    <View style={[styles.row, item.is_me && styles.rowMe]}>
      <Text style={[styles.rank, item.is_me && styles.rankMe]}>{item.rank}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, item.is_me && styles.nameMe]} numberOfLines={1}>
          {item.display_name}
          {item.is_me ? ' (You)' : ''}
        </Text>
        <Text style={styles.detail}>
          {item.correct}/{item.total} correct
        </Text>
      </View>
      <Text style={[styles.pct, item.is_me && styles.pctMe]}>{item.accuracy_pct}%</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Accuracy of picks you viewed</Text>
        <View style={styles.periodRow}>
          {(['weekly', 'monthly', 'all'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'all' ? 'All time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListEmptyComponent={
            <PremiumFeatureEmptyState
              icon="podium-outline"
              badge="Premium"
              title={communityWarming ? 'Leaderboard warming up' : 'Be the first on the board'}
              message={
                communityWarming
                  ? `Rankings appear once at least ${minActiveUsers} Premium members have viewed finished games. Open a few game predictions now — you could be #1.`
                  : 'View predictions on finished games to join the board. Your accuracy is tracked when you open game detail before the final whistle.'
              }
              primaryLabel="Browse games"
              onPrimaryPress={() =>
                navigation.navigate('MainTabs', { screen: 'Games' } as never)
              }
              secondaryLabel="View model accuracy"
              onSecondaryPress={() => navigation.navigate('Accuracy')}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gate: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  upgradeBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: theme.colors.background,
    fontWeight: '700',
    fontSize: 16,
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
    marginBottom: theme.spacing.sm,
  },
  periodRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundCard,
  },
  periodBtnActive: {
    backgroundColor: theme.colors.accentDim,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  periodTextActive: {
    color: theme.colors.accent,
  },
  listContent: {
    padding: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.xs,
  },
  rowMe: {
    backgroundColor: theme.colors.accentDim,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  rank: {
    width: 32,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  rankMe: {
    color: theme.colors.accent,
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  nameMe: {
    color: theme.colors.accent,
  },
  detail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  pct: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  pctMe: {
    color: theme.colors.accent,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
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

/**
 * Leaderboards: rank by prediction-view accuracy (weekly / monthly / all).
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
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';

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

export const LeaderboardsScreen: React.FC = () => {
  const [period, setPeriod] = useState<Period>('monthly');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await apiService.getLeaderboards({ period, limit: 50 });
        setEntries(res.entries ?? []);
      } catch (e) {
        setError(getUserFriendlyMessage(e));
        setEntries([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period]
  );

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: Entry }) => (
    <View
      style={[
        styles.row,
        item.is_me && styles.rowMe,
      ]}
    >
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
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No leaderboard data yet. View game predictions to appear here.
              </Text>
            </View>
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

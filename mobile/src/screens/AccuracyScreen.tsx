import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';

interface AccuracyData {
  total_games: number;
  correct: number;
  accuracy_pct: number;
  by_league: Record<string, { total: number; correct: number; accuracy_pct: number }>;
}

export const AccuracyScreen: React.FC = () => {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiService.getAccuracy();
      setData(res);
    } catch (e) {
      setError(getUserFriendlyMessage(e));
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const d = data!;
  const leagues = Object.entries(d.by_league || {}).sort((a, b) => b[1].total - a[1].total);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[theme.colors.accent]} />
      }
    >
      <Text style={styles.title}>How we've done</Text>
      <Text style={styles.subtitle}>Prediction accuracy on finished games</Text>

      <View style={styles.card}>
        <Text style={styles.bigNumber}>{d.accuracy_pct}%</Text>
        <Text style={styles.cardLabel}>Overall accuracy</Text>
        <Text style={styles.cardDetail}>
          {d.correct} correct out of {d.total_games} games
        </Text>
      </View>

      {d.total_games === 0 && (
        <Text style={styles.emptyText}>
          No finished games with predictions yet. Accuracy will appear here as games complete.
        </Text>
      )}

      {leagues.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>By league</Text>
          {leagues.map(([league, stats]) => (
            <View key={league} style={styles.leagueRow}>
              <Text style={styles.leagueName}>{league.replace(/_/g, ' ').toUpperCase()}</Text>
              <Text style={styles.leagueStat}>
                {stats.accuracy_pct}% ({stats.correct}/{stats.total})
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl + theme.spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  bigNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  cardLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  cardDetail: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  leagueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.md,
    borderRadius: theme.radii.sm,
    marginBottom: theme.spacing.sm,
  },
  leagueName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  leagueStat: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import type { UserBrierStatsResponse } from '../services/api';

type Props = {
  stats: UserBrierStatsResponse;
};

export const UserPickStatsCard: React.FC<Props> = ({ stats }) => {
  const clv = stats.clv;
  const showClv = clv.scored_picks > 0 && clv.avg_clv != null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your pick performance</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {stats.accuracy_pct != null ? `${stats.accuracy_pct}%` : '—'}
          </Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {stats.user_brier != null ? stats.user_brier.toFixed(3) : '—'}
          </Text>
          <Text style={styles.statLabel}>Brier (you)</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {stats.model_brier != null ? stats.model_brier.toFixed(3) : '—'}
          </Text>
          <Text style={styles.statLabel}>Brier (model)</Text>
        </View>
      </View>
      {showClv ? (
        <View style={styles.clvRow}>
          <Text style={styles.clvTitle}>Closing line value (CLV)</Text>
          <Text style={styles.clvText}>
            Avg CLV {clv.avg_clv! >= 0 ? '+' : ''}
            {(clv.avg_clv! * 100).toFixed(1)}% on {clv.scored_picks} graded picks
            {clv.positive_clv_pct != null ? ` · ${clv.positive_clv_pct}% positive` : ''}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          CLV appears after finished games with market snapshots at pick time.
        </Text>
      )}
      <Text style={styles.meta}>
        {stats.scored_picks} graded · {stats.pending_picks} pending · {stats.total_picks} total
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  clvRow: {
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  clvTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  clvText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
  },
  meta: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});

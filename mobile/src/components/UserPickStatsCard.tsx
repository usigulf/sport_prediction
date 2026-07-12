import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../constants/theme';
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import type { UserBrierStatsResponse } from '../services/api';

type Props = {
  stats: UserBrierStatsResponse;
  onQuarantined?: () => void;
};

export const UserPickStatsCard: React.FC<Props> = ({ stats, onQuarantined }) => {
  const clv = stats.clv;
  const showClv = clv.scored_picks > 0 && clv.avg_clv != null;
  const unverified = stats.unverified_legacy_picks ?? 0;
  const [quarantining, setQuarantining] = useState(false);

  const clearUnverified = async () => {
    setQuarantining(true);
    try {
      const res = await apiService.quarantineUnverifiedPicks();
      Alert.alert('Scorecard', `Removed ${res.deleted} unverified pick(s).`);
      onQuarantined?.();
    } catch (e) {
      Alert.alert('Scorecard', getUserFriendlyMessage(e));
    } finally {
      setQuarantining(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your recorded picks</Text>
      <Text style={styles.subtitle}>
        Only picks you explicitly save on game detail count. Model-auto rows are excluded.
      </Text>
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
      {unverified > 0 ? (
        <View style={styles.quarantineBox}>
          <Text style={styles.quarantineText}>
            {unverified} legacy/auto pick(s) are excluded from this scorecard.
          </Text>
          <TouchableOpacity
            style={styles.quarantineBtn}
            onPress={() => void clearUnverified()}
            disabled={quarantining}
            accessibilityRole="button"
            accessibilityLabel="Remove unverified picks"
          >
            {quarantining ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <Text style={styles.quarantineBtnText}>Remove unverified</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
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
  quarantineBox: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  quarantineText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  quarantineBtn: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  quarantineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.background,
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import type { LineMovementResponse } from '../services/api';

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  payload: LineMovementResponse;
};

function pct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 1000) / 10}%`;
}

export const LineMovementCard: React.FC<Props> = ({ homeTeamName, awayTeamName, payload }) => {
  const summary = useMemo(() => {
    const withHome = payload.points.filter((p) => p.home_implied_prob != null);
    if (withHome.length === 0) return null;
    const first = withHome[0];
    const last = withHome[withHome.length - 1];
    const delta =
      first.home_implied_prob != null && last.home_implied_prob != null
        ? last.home_implied_prob - first.home_implied_prob
        : null;
    return { first, last, delta };
  }, [payload.points]);

  if (payload.point_count < 2 || !summary) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="pulse-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.title}>Line movement</Text>
        </View>
        <Text style={styles.muted}>
          {payload.point_count === 0
            ? 'Snapshots appear after market odds are fetched for this game.'
            : 'Need at least two snapshots to show movement.'}
        </Text>
      </View>
    );
  }

  const delta = summary.delta ?? 0;
  const deltaLabel =
    delta > 0.005
      ? `${homeTeamName} implied prob up ${pct(delta)}`
      : delta < -0.005
        ? `${homeTeamName} implied prob down ${pct(Math.abs(delta))}`
        : 'Consensus stable since first snapshot';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="pulse-outline" size={18} color={theme.colors.accent} />
        <Text style={styles.title}>Line movement</Text>
        <Text style={styles.meta}>{payload.point_count} snaps</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Open ({homeTeamName})</Text>
          <Text style={styles.value}>{pct(summary.first.home_implied_prob)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Latest</Text>
          <Text style={styles.value}>{pct(summary.last.home_implied_prob)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>{awayTeamName}</Text>
          <Text style={styles.value}>{pct(summary.last.away_implied_prob)}</Text>
        </View>
      </View>
      <View style={styles.sparkRow}>
        {payload.points.slice(-12).map((point, idx) => {
          const h = point.home_implied_prob ?? 0;
          const height = Math.max(4, Math.round(h * 48));
          return (
            <View
              key={`${point.captured_at_iso ?? idx}`}
              style={[styles.sparkBar, { height }]}
              accessibilityLabel={`Home implied ${pct(h)}`}
            />
          );
        })}
      </View>
      <Text style={styles.delta}>{deltaLabel}</Text>
      <Text style={styles.disclaimer}>
        {payload.disclaimer ??
          'Historical consensus snapshots — informational only, not a live odds feed.'}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 52,
    marginBottom: theme.spacing.sm,
  },
  sparkBar: {
    flex: 1,
    backgroundColor: theme.colors.accentDim,
    borderRadius: 2,
    minHeight: 4,
  },
  delta: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
  },
});

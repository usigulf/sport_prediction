import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ModelVsClosingResponse } from '../../services/api';
import { theme } from '../../constants/theme';

type Props = {
  closing: ModelVsClosingResponse | null;
  failed: boolean;
};

export function ClosingLineCard({ closing, failed }: Props) {
  if (failed) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Model vs closing market</Text>
        <Text style={styles.hint}>Closing-line comparison unavailable. Pull to refresh.</Text>
      </View>
    );
  }
  if (!closing) return null;

  const ready = closing.acceptance_ready;
  const sampleMet = closing.ledger_sample_met;

  return (
    <View style={styles.card} accessibilityLabel="Model versus closing market">
      <Text style={styles.title}>Model vs closing market</Text>
      <Text style={styles.hint}>
        Log-loss on finished games with a frozen closing consensus. Lower is better. Used by the
        public_charge acceptance gate — not betting advice.
      </Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Model</Text>
          <Text style={styles.statValue}>
            {closing.model_mean_log_loss != null ? closing.model_mean_log_loss.toFixed(4) : '—'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Market</Text>
          <Text style={styles.statValue}>
            {closing.market_mean_log_loss != null ? closing.market_mean_log_loss.toFixed(4) : '—'}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {closing.scored_games} scored
        {sampleMet ? '' : ` (need ≥${closing.min_scored_for_acceptance})`}
        {' · '}
        {ready
          ? 'Beats or ties closing (acceptance-ready)'
          : closing.model_beats_or_ties_closing_market
            ? 'Beats market but sample too small'
            : 'Does not yet beat closing market'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.borderSubtle,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  stat: { flex: 1 },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    lineHeight: 17,
  },
});

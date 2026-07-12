import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { accuracyBlockTotals } from './accuracyFormatters';

type WindowBlock = {
  label: string;
  total?: number;
  total_games?: number;
  correct?: number;
  accuracy_pct?: number;
};

type Props = {
  windows: WindowBlock[];
};

export function ScoreWindowGrid({ windows }: Props) {
  return (
    <View style={styles.grid} accessibilityLabel="Accuracy windows">
      {windows.map((w) => {
        const { total, correct, pct } = accuracyBlockTotals(w);
        return (
          <View key={w.label} style={styles.cell}>
            <Text style={styles.label}>{w.label}</Text>
            <Text style={styles.pct}>{pct != null ? `${pct}%` : '—'}</Text>
            <Text style={styles.meta}>
              {correct}/{total} games
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  cell: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  pct: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});

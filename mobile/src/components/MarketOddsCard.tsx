import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import type { MarketOddsResponse } from '../services/api';

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  payload: MarketOddsResponse;
};

function formatAmericanLine(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  const n = Math.round(value);
  return n > 0 ? `+${n}` : `${n}`;
}

function edgeBadge(
  label: MarketOddsResponse['model_comparison'] extends { edge_label?: infer E } ? E : never,
  edgePct: number | null | undefined,
  homeName: string,
  awayName: string,
): { text: string; tone: 'home' | 'away' | 'neutral' } {
  switch (label) {
    case 'model_leans_home':
      return {
        text: `Model +${Math.abs(edgePct ?? 0).toFixed(1)}% vs market on ${homeName}`,
        tone: 'home',
      };
    case 'model_leans_away':
      return {
        text: `Model +${Math.abs(edgePct ?? 0).toFixed(1)}% vs market on ${awayName}`,
        tone: 'away',
      };
    case 'aligned':
      return { text: 'Model aligned with market', tone: 'neutral' };
    default:
      return { text: 'Model vs market', tone: 'neutral' };
  }
}

export const MarketOddsCard: React.FC<Props> = ({ homeTeamName, awayTeamName, payload }) => {
  if (!payload.available || !payload.consensus) return null;

  const c = payload.consensus;
  const homeMl = formatAmericanLine(c.home_moneyline ?? null);
  const awayMl = formatAmericanLine(c.away_moneyline ?? null);
  const spread =
    c.spread_home != null
      ? `${homeTeamName} ${c.spread_home > 0 ? '+' : ''}${c.spread_home}`
      : null;
  const total = c.total_points != null ? `O/U ${c.total_points}` : null;

  const lineParts = [spread, total].filter(Boolean);
  const moneyline =
    homeMl && awayMl ? `${homeTeamName} ${homeMl} · ${awayTeamName} ${awayMl}` : null;

  const badge = edgeBadge(
    payload.model_comparison?.edge_label,
    payload.model_comparison?.home_edge_pct,
    homeTeamName,
    awayTeamName,
  );

  const badgeBg =
    badge.tone === 'home'
      ? theme.colors.accentDim
      : badge.tone === 'away'
        ? theme.colors.secondaryDim
        : theme.colors.backgroundElevated;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="stats-chart-outline" size={18} color={theme.colors.accent} />
        <Text style={styles.title}>Market consensus</Text>
        {payload.book_count ? (
          <Text style={styles.meta}>{payload.book_count} books</Text>
        ) : null}
      </View>
      {lineParts.length > 0 ? (
        <Text style={styles.lineText}>{lineParts.join(' · ')}</Text>
      ) : null}
      {moneyline ? <Text style={styles.lineSub}>{moneyline}</Text> : null}
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={styles.badgeText}>{badge.text}</Text>
      </View>
      <Text style={styles.disclaimer}>
        {payload.disclaimer ??
          'Informational consensus only — not betting advice or a sportsbook offer.'}
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
  lineText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  lineSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: theme.spacing.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
  },
});

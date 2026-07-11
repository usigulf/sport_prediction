import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import type { PlayerPropItem } from '../../screens/gameDetail/types';

function confidenceColors(level: string | undefined) {
  switch (level?.toLowerCase()) {
    case 'high':
      return { bg: theme.colors.confidenceHigh, fg: theme.colors.background };
    case 'medium':
      return { bg: theme.colors.confidenceMedium, fg: theme.colors.background };
    case 'low':
      return { bg: theme.colors.confidenceLow, fg: theme.colors.background };
    default:
      return { bg: theme.colors.textMuted, fg: theme.colors.background };
  }
}

type Props = {
  prop: PlayerPropItem;
  compact?: boolean;
};

export function PlayerPropRow({ prop, compact }: Props) {
  const badge = confidenceColors(prop.confidence_level);

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.header}>
        <Text style={styles.player}>{prop.player_name}</Text>
        {prop.confidence_level ? (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>
              {prop.confidence_level}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.meta}>
        {prop.prop_type} — model line {prop.line} {prop.unit}
        {prop.team ? ` · ${prop.team}` : ''}
      </Text>
      <Text style={styles.projected}>
        Projected: {prop.predicted_value} {prop.unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  rowCompact: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  player: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  meta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  projected: {
    fontSize: 13,
    color: theme.colors.accent,
    marginTop: 2,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BETA_SOCCER_ONLY } from '../constants/leagues';
import { theme } from '../constants/theme';

/**
 * Clarifies soccer beta scope and that NFL/NBA are hidden until real pipelines ship.
 */
export const SoccerBetaNotice: React.FC<{ compact?: boolean }> = ({ compact }) => {
  if (!BETA_SOCCER_ONLY) return null;

  return (
    <View style={[styles.box, compact && styles.boxCompact]}>
      <Text style={styles.title}>Soccer beta</Text>
      <Text style={styles.body}>
        This release focuses on soccer competitions with ClearSports schedules. Premium and Pro
        subscribers see no ads. NFL and NBA are hidden until full data pipelines are live.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderSubtle,
  },
  boxCompact: {
    marginHorizontal: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textMuted,
  },
});

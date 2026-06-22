import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { useModelStatus } from '../hooks/useModelStatus';

/**
 * Shown while the backend has not published sklearn artifacts yet (GET /stats/model).
 */
export const ModelWarmingNotice: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { isWarming, status, loading } = useModelStatus();

  if (loading || !isWarming) return null;

  const games = status?.games;
  const gamesHint =
    games != null && games > 0
      ? ` ${games.toLocaleString()} finished games logged so far.`
      : '';

  return (
    <View style={[styles.box, compact && styles.boxCompact]}>
      <Text style={styles.title}>Model warming</Text>
      <Text style={styles.body}>
        We are collecting more decisive game history before publishing the full ML model.{gamesHint} Until
        then, picks use our baseline engine — accuracy and confidence labels still reflect finished results.
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
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  boxCompact: {
    marginHorizontal: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textMuted,
  },
});

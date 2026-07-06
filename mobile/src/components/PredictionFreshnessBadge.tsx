import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import type { Prediction } from '../types';
import { buildPredictionFreshnessLabel } from '../utils/formatFreshness';
import { predictionSourceBadgeLabel } from '../utils/predictionTrust';

type Props = {
  prediction: Pick<
    Prediction,
    'model_version' | 'standings_last_updated_iso' | 'created_at' | 'prediction_source'
  >;
};

export function PredictionFreshnessBadge({ prediction }: Props) {
  const sourceLabel = predictionSourceBadgeLabel(prediction.prediction_source);
  const label = buildPredictionFreshnessLabel(prediction);
  const text = [sourceLabel, label].filter(Boolean).join(' · ');
  if (!text) return null;

  return (
    <View style={styles.badge} accessibilityRole="text">
      <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  text: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
});

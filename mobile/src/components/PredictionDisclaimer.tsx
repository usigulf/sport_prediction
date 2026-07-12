import React from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { theme } from '../constants/theme';
import { demoModelDisclaimer } from '../utils/predictionTrust';

type Props = {
  league?: string | null;
  predictionSource?: string | null;
  compact?: boolean;
  style?: StyleProp<TextStyle>;
};

const DEFAULT_COPY = 'Informational model output — not betting advice.';

export function PredictionDisclaimer({
  league,
  predictionSource,
  compact = false,
  style,
}: Props) {
  const text = demoModelDisclaimer(league, predictionSource) || DEFAULT_COPY;
  return (
    <Text
      style={[styles.base, compact && styles.compact, style]}
      accessibilityRole="text"
      accessibilityLabel={text}
      maxFontSizeMultiplier={theme.maxFontSizeMultiplier}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textMuted,
  },
  compact: {
    fontSize: 11,
    lineHeight: 15,
  },
});

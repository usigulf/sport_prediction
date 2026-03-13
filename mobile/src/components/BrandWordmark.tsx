import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

const SIZES: Record<string, number> = { small: 20, medium: 24, large: 28 };

export function BrandWordmark(props: { size?: string }) {
  const size = props.size || 'medium';
  const fontSize = SIZES[size] || 24;
  return (
    <Text style={[styles.wordmark, { fontSize }]} numberOfLines={1}>
      <Text style={[styles.accent, { fontSize }]}>O</Text>ctobet
    </Text>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  accent: { color: theme.colors.accent },
});

/**
 * octobetiQ wordmark: leading "o" and trailing "Q" in accent; "ctobeti" in text color.
 */
import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { theme } from '../constants/theme';

export type WordmarkVariant = 'header' | 'title' | 'small';

const VARIANT_STYLES: Record<WordmarkVariant, { wordmark: TextStyle }> = {
  header: {
    wordmark: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
  },
  title: {
    wordmark: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
  },
  small: {
    wordmark: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
  },
};

export interface OctobetiQWordmarkProps {
  variant?: WordmarkVariant;
  style?: TextStyle;
}

export function OctobetiQWordmark({ variant = 'header', style }: OctobetiQWordmarkProps) {
  const base = VARIANT_STYLES[variant].wordmark;
  return (
    <Text style={[base, style]}>
      <Text style={styles.accent}>o</Text>
      ctobeti
      <Text style={styles.accent}>Q</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  accent: {
    color: theme.colors.accent,
  },
});

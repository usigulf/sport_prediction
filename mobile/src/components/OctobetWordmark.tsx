/**
 * Reusable Octobet wordmark: "O" in accent green + "ctobet" in text color.
 * Use for header, login, profile, and any branded title.
 */
import React from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
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

export interface OctobetWordmarkProps {
  variant?: WordmarkVariant;
  style?: TextStyle;
}

export function OctobetWordmark({ variant = 'header', style }: OctobetWordmarkProps) {
  const base = VARIANT_STYLES[variant].wordmark;
  return (
    <Text style={[base, style]}>
      <Text style={styles.accent}>O</Text>ctobet
    </Text>
  );
}

const styles = StyleSheet.create({
  accent: {
    color: theme.colors.accent,
  },
});

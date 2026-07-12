import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { OctobetiQWordmark } from './OctobetiQWordmark';
import { theme } from '../constants/theme';

/**
 * Shown while auth/storage restores after the native splash hides.
 */
export function LaunchScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.logoRing}>
        <OctobetiQWordmark variant="title" />
      </View>
      <Text style={styles.tagline}>AI picks with tracked accuracy</Text>
      <ActivityIndicator
        size="large"
        color={theme.colors.accent}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  logoRing: {
    marginBottom: theme.spacing.md,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  spinner: {
    marginTop: theme.spacing.xl,
  },
});

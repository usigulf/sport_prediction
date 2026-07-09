import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

type Props = {
  message: string;
  onRetry?: () => void;
  cacheHint?: string | null;
};

export function FeedErrorBanner({ message, onRetry, cacheHint }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
      {cacheHint ? <Text style={styles.hint}>{cacheHint}</Text> : null}
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Retry loading"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.secondaryDim,
    padding: theme.spacing.sm + 4,
    margin: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  text: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface PremiumFeatureEmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  badge?: string;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}

/**
 * Shared empty state for Premium-gated social features (leaderboards, challenges).
 */
export const PremiumFeatureEmptyState: React.FC<PremiumFeatureEmptyStateProps> = ({
  icon,
  title,
  message,
  badge,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
}) => (
  <View style={styles.wrap}>
    {badge ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    ) : null}
    <Ionicons name={icon} size={56} color={theme.colors.accent} style={styles.icon} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {primaryLabel && onPrimaryPress ? (
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onPrimaryPress}
      >
        <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
      </Pressable>
    ) : null}
    {secondaryLabel && onSecondaryPress ? (
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        onPress={onSecondaryPress}
      >
        <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: theme.colors.accentDim,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    marginBottom: theme.spacing.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  icon: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  primaryBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  secondaryBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  pressed: {
    opacity: 0.88,
  },
});

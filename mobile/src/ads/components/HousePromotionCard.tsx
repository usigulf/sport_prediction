import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HOUSE_PROMO_SUBTITLE } from '../../constants/premiumCopy';
import { theme } from '../../constants/theme';

type Props = {
  title?: string;
  subtitle?: string;
  surface: 'home' | 'liveHub' | 'game_detail' | 'results' | string;
};

/**
 * House ad when mediation waterfall has no fill — keeps layout stable (no empty slots).
 */
export const HousePromotionCard: React.FC<Props> = ({
  title = 'Try octobetiQ Premium',
  subtitle = HOUSE_PROMO_SUBTITLE,
  surface,
}) => {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={`Sponsored promotion: ${title}`}
    >
      <View style={styles.badgeRow} importantForAccessibility="no">
        <Ionicons name="pricetag-outline" size={14} color={theme.colors.accent} />
        <Text style={styles.sponsored}>Sponsored</Text>
      </View>
      <Text style={styles.headline}>{title}</Text>
      <Text style={styles.body}>{subtitle}</Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={() =>
          Linking.openURL('https://octobetiq.com').catch(() => undefined)
        }
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Learn more about Premium on octobetiq.com"
        accessibilityHint="Opens the website"
      >
        <Text style={styles.ctaText}>Learn more</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.background} />
      </TouchableOpacity>
      <Text style={styles.meta} importantForAccessibility="no">
        {surface}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundCard,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sponsored: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    borderRadius: theme.radii.sm,
    minHeight: theme.minTouchSize,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.background,
  },
  meta: {
    marginTop: 8,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});

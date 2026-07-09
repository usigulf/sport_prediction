import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { apiService } from '../../services/api';
import { PredictionDisclaimer } from '../PredictionDisclaimer';
import { trialDaysFromServer } from '../../utils/resolvedFeatureFlags';
import type { ServerFeatureFlags } from '../../hooks/useServerFeatureFlags';

type Props = {
  serverFlags: ServerFeatureFlags;
};

export function PaywallHero({ serverFlags }: Props) {
  const [accuracyPct, setAccuracyPct] = useState<number | null>(null);
  const trialDays = trialDaysFromServer(serverFlags);

  useEffect(() => {
    let cancelled = false;
    void apiService.getAccuracy().then((res) => {
      if (!cancelled && typeof res?.accuracy_pct === 'number') {
        setAccuracyPct(Math.round(res.accuracy_pct));
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.hero} accessibilityRole="header">
      <Text style={styles.brand}>octobetiQ</Text>
      <Text style={styles.headline}>AI picks with tracked accuracy</Text>
      <Text style={styles.sub}>
        Unlimited predictions, live updates, and methodology you can verify in-app.
      </Text>
      <View style={styles.pills}>
        {accuracyPct != null ? (
          <View style={styles.pill}>
            <Ionicons name="stats-chart" size={14} color={theme.colors.accent} />
            <Text style={styles.pillText}>{accuracyPct}% model accuracy</Text>
          </View>
        ) : null}
        <View style={styles.pill}>
          <Ionicons name="gift-outline" size={14} color={theme.colors.accent} />
          <Text style={styles.pillText}>{trialDays}-day free trial</Text>
        </View>
      </View>
      <PredictionDisclaimer compact style={styles.disclaimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.colors.accent,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accentDim,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  disclaimer: {
    marginTop: theme.spacing.sm,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    features: ['Daily prediction limit', 'Basic game predictions', 'Favorites'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    period: '/month',
    features: ['Unlimited predictions', 'Full explanations', 'Live in-game updates', 'Priority support'],
  },
  {
    id: 'premium_plus',
    name: 'Pro',
    price: '$29.99',
    period: '/month',
    features: ['Everything in Premium', 'Advanced analytics', 'API access', 'Dedicated support'],
  },
];

export const PaywallScreen: React.FC = () => {
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTier = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const info = await apiService.getCurrentUser() as { subscription_tier?: string };
      if (info?.subscription_tier) setCurrentTier(info.subscription_tier);
    } catch (e) {
      setLoadError(getUserFriendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTier();
  }, [loadTier]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) loadTier();
    }, [loadTier, loading])
  );

  const handleSubscribe = useCallback(async (tierId: string) => {
    if (tierId === 'free') return;
    try {
      const { url } = await apiService.createCheckoutSession();
      if (url) await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Checkout', getUserFriendlyMessage(e));
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTier}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Text style={styles.title}>Choose your plan</Text>
      <Text style={styles.subtitle}>
        {currentTier === 'free' ? 'Upgrade for unlimited predictions and more.' : 'You\'re on a paid plan. Manage below.'}
      </Text>

      {TIERS.map((tier) => {
        const isCurrent = currentTier === tier.id;
        const isPaid = tier.id !== 'free';
        return (
          <View
            key={tier.id}
            style={[styles.card, isCurrent && styles.cardCurrent]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{tier.price}</Text>
                <Text style={styles.period}>{tier.period}</Text>
              </View>
              {isCurrent && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Current plan</Text>
                </View>
              )}
            </View>
            <View style={styles.features}>
              {tier.features.map((f, i) => (
                <Text key={i} style={styles.feature}>• {f}</Text>
              ))}
            </View>
            {isPaid && (
              <TouchableOpacity
                style={[styles.cta, isCurrent && styles.ctaCurrent]}
                disabled={isCurrent}
                onPress={() => handleSubscribe(tier.id)}
              >
                <Text style={[styles.ctaText, isCurrent && styles.ctaTextCurrent]}>
                  {isCurrent ? 'Current plan' : tier.id === 'premium' ? 'Start 7-day free trial' : 'Coming soon'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <Text style={styles.footer}>
        Premium includes a 7-day free trial. Pro plan coming soon.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: theme.colors.secondaryDim,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radii.sm,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
  },
  cardCurrent: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentDim,
  },
  cardHeader: {
    marginBottom: 12,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  period: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.background,
    fontWeight: '600',
  },
  features: {
    marginBottom: 16,
  },
  feature: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  cta: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
  },
  ctaCurrent: {
    backgroundColor: theme.colors.border,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  ctaTextCurrent: {
    color: theme.colors.textMuted,
  },
  footer: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
});

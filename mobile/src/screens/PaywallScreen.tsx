import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  AppState,
  type AppStateStatus,
} from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchUserProfile, setSubscriptionTier } from '../store/slices/authSlice';
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';
import { PLAN_MATRIX } from '../constants/planFeatures';
import { normalizeSubscriptionTier, type NormalizedTier } from '../utils/subscription';
import {
  isPurchasesAvailable,
  getOfferingPackages,
  purchasePackage,
  restorePurchases,
  type OfferingPackage,
} from '../services/purchases';

const CHECKOUT_TIMEOUT_MS = 20000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let id: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error('Checkout request timed out. Please try again.')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (id) clearTimeout(id);
  }) as Promise<T>;
}

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    features: [...PLAN_MATRIX.free],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    period: '/month',
    features: [...PLAN_MATRIX.premium],
  },
  {
    id: 'premium_plus',
    name: 'Pro',
    price: '$29.99',
    period: '/month',
    features: [...PLAN_MATRIX.pro],
  },
];

type PaywallRoute = RouteProp<
  { Paywall: { emphasizeTier?: 'premium' | 'premium_plus'; contextMessage?: string } },
  'Paywall'
>;

export const PaywallScreen: React.FC = () => {
  const route = useRoute<PaywallRoute>();
  const emphasizeTier = route.params?.emphasizeTier;
  const contextMessage = route.params?.contextMessage;
  const contextBannerText =
    contextMessage ??
    (emphasizeTier === 'premium_plus'
      ? 'Pro unlocks challenges, leaderboards, and everything in Premium.'
      : emphasizeTier === 'premium'
        ? 'Premium unlocks unlimited picks, full analysis, live updates, and player props.'
        : undefined);

  const dispatch = useAppDispatch();
  const reduxTier = useAppSelector((s) => s.auth.user?.subscriptionTier ?? 'free');

  const [currentTier, setCurrentTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [packages, setPackages] = useState<OfferingPackage[]>([]);
  const [restoring, setRestoring] = useState(false);

  // Store billing (App Store / Play Billing via RevenueCat) is the compliant
  // path when the native SDK + a configured offering are present; otherwise we
  // fall back to web (Stripe) checkout.
  const storeBillingReady = isPurchasesAvailable() && packages.length > 0;

  useEffect(() => {
    if (!isPurchasesAvailable()) return;
    let active = true;
    void getOfferingPackages()
      .then((pkgs) => {
        if (active) setPackages(pkgs);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const applyTier = useCallback(
    (tier: NormalizedTier) => {
      dispatch(setSubscriptionTier(tier));
      setCurrentTier(tier);
      void dispatch(fetchUserProfile())
        .unwrap()
        .then((info) => setCurrentTier(normalizeSubscriptionTier(info.subscription_tier)))
        .catch(() => {});
    },
    [dispatch],
  );

  const loadTier = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const info = await dispatch(fetchUserProfile()).unwrap();
      setCurrentTier(normalizeSubscriptionTier(info.subscription_tier));
    } catch (e) {
      setCurrentTier(reduxTier);
      setLoadError(getUserFriendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }, [dispatch, reduxTier]);

  // Do not put `loading` in this callback's deps: when load finishes, `loading` flips to false,
  // React Navigation re-runs the focus effect, and `loadTier()` runs again → infinite blink.
  useFocusEffect(
    useCallback(() => {
      loadTier();
    }, [loadTier])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void loadTier();
      }
    });
    return () => sub.remove();
  }, [loadTier]);

  const purchaseViaStore = useCallback(
    async (tierId: 'premium' | 'premium_plus'): Promise<boolean> => {
      const pkg =
        packages.find((p) => p.tier === tierId) ??
        (tierId === 'premium' ? packages.find((p) => p.tier === 'premium') : undefined);
      if (!pkg) return false;
      const res = await purchasePackage(pkg.raw);
      if (res.cancelled) return true;
      if (res.tier !== 'free') {
        applyTier(res.tier);
      } else {
        Alert.alert(
          'Purchase',
          'Purchase went through but no plan is active yet. Tap "Restore purchases" in a moment.',
        );
      }
      return true;
    },
    [packages, applyTier],
  );

  const handleSubscribe = useCallback(
    async (tierId: string) => {
      if (tierId !== 'premium' && tierId !== 'premium_plus') return;
      setCheckoutLoadingTier(tierId);
      try {
        // Preferred: in-app purchase via the store (App Store / Play Billing).
        if (storeBillingReady) {
          const handled = await purchaseViaStore(tierId);
          if (handled) return;
        }
        // Fallback: Stripe web checkout (web platform or store billing unavailable).
        const { url } = await withTimeout(
          apiService.createCheckoutSession(tierId),
          CHECKOUT_TIMEOUT_MS,
        );
        if (!url) {
          Alert.alert('Checkout', 'Checkout URL missing. Payments may not be configured yet.');
          return;
        }
        setCheckoutLoadingTier(null);
        await WebBrowser.openBrowserAsync(url);
        const info = await dispatch(fetchUserProfile()).unwrap();
        setCurrentTier(normalizeSubscriptionTier(info.subscription_tier));
      } catch (e) {
        Alert.alert('Checkout', getUserFriendlyMessage(e));
      } finally {
        setCheckoutLoadingTier(null);
      }
    },
    [storeBillingReady, purchaseViaStore, dispatch],
  );

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const tier = await restorePurchases();
      if (tier !== 'free') {
        applyTier(tier);
        Alert.alert('Restored', 'Your subscription has been restored.');
      } else {
        Alert.alert('Restore purchases', 'No active subscription found for this account.');
      }
    } catch (e) {
      Alert.alert('Restore purchases', getUserFriendlyMessage(e));
    } finally {
      setRestoring(false);
    }
  }, [applyTier]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const appVersion =
    Constants.expoConfig?.version ?? (Constants as { nativeAppVersion?: string }).nativeAppVersion ?? '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTier}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {contextBannerText ? (
        <View style={styles.contextBanner}>
          <Text style={styles.contextBannerText}>{contextBannerText}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>Choose your plan</Text>
      <Text style={styles.subtitle}>
        {contextBannerText
          ? 'Pick the plan that matches what you need.'
          : currentTier === 'free'
            ? 'Upgrade for unlimited predictions and more.'
            : 'You\'re on a paid plan. Manage below.'}
      </Text>

      {TIERS.map((tier) => {
        const isCurrent = currentTier === tier.id;
        const isPaid = tier.id !== 'free';
        const loadingThis = checkoutLoadingTier === tier.id;
        const showSubscribe = isPaid && !isCurrent;

        const cardBody = (
          <>
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
              {tier.id === 'premium_plus' && !isCurrent && (
                <View style={styles.availableBadge}>
                  <Text style={styles.availableBadgeText}>
                    {storeBillingReady ? 'Available now — in-app purchase' : 'Available now'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.features}>
              {tier.features.map((f, i) => (
                <Text key={i} style={styles.feature}>• {f}</Text>
              ))}
            </View>
            {isPaid && (
              <View style={[styles.cta, isCurrent && styles.ctaCurrent]}>
                {loadingThis ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={[styles.ctaText, isCurrent && styles.ctaTextCurrent]}>
                    {isCurrent
                      ? 'Current plan'
                      : tier.id === 'premium'
                        ? 'Start 7-day free trial'
                        : 'Subscribe to Pro for $29.99/mo'}
                  </Text>
                )}
              </View>
            )}
          </>
        );

        if (showSubscribe) {
          return (
            <Pressable
              key={tier.id}
              accessibilityRole="button"
              accessibilityLabel={
                tier.id === 'premium'
                  ? 'Subscribe to Premium with 7-day free trial'
                  : 'Subscribe to Pro for 29.99 dollars per month'
              }
              disabled={loadingThis}
              onPress={() => handleSubscribe(tier.id)}
              android_ripple={{ color: 'rgba(0,255,159,0.25)' }}
              style={({ pressed }) => [
                styles.card,
                isCurrent && styles.cardCurrent,
                emphasizeTier === tier.id && styles.cardEmphasized,
                Platform.OS === 'ios' && pressed && !loadingThis && styles.cardPressed,
              ]}
            >
              {cardBody}
            </Pressable>
          );
        }

        return (
          <View
            key={tier.id}
            style={[
              styles.card,
              isCurrent && styles.cardCurrent,
              emphasizeTier === tier.id && styles.cardEmphasized,
            ]}
          >
            {cardBody}
          </View>
        );
      })}

      {isPurchasesAvailable() ? (
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
        >
          {restoring ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <Text style={styles.restoreButtonText}>Restore purchases</Text>
          )}
        </TouchableOpacity>
      ) : null}

      <Text style={styles.footer}>
        {storeBillingReady
          ? 'Subscriptions are billed through your App Store / Google Play account and renew until cancelled in your store settings. Premium: 7-day free trial, then $9.99/month. Pro: $29.99/month. Paid plans are ad-free.'
          : 'Premium: 7-day free trial, then $9.99/month until cancelled. Pro: $29.99/month. Paid plans are ad-free. After checkout, return to the app and open Subscription again to refresh your plan.'}
      </Text>
      <Text style={styles.footerVersion}>App v{appVersion}</Text>
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
  cardPressed: {
    opacity: 0.92,
  },
  cardEmphasized: {
    borderColor: theme.colors.accent,
    borderWidth: 3,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  contextBanner: {
    backgroundColor: theme.colors.accentDim,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  contextBannerText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
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
  availableBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  availableBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
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
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  footer: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  footerVersion: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.75,
  },
});

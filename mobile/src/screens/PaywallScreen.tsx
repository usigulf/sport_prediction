import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useFocusEffect, useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchUserProfile, setSubscriptionTier } from '../store/slices/authSlice';
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';
import { PLAN_MATRIX } from '../constants/planFeatures';
import {
  displayPremiumAnnualPrice,
  displayPremiumMonthlyPrice,
  premiumAnnualPriceWithPeriod,
  premiumAnnualSavingsPercent,
  PREMIUM_ANNUAL_PRICE_LABEL,
  PREMIUM_MONTHLY_PRICE_LABEL,
  premiumMonthlyPriceWithPeriod,
  type BillingPeriod,
} from '../constants/subscriptionPricing';
import { normalizeSubscriptionTier, type NormalizedTier } from '../utils/subscription';
import {
  isPurchasesAvailable,
  getOfferingPackages,
  getLastOfferingsError,
  purchasePackage,
  restorePurchases,
  type OfferingPackage,
} from '../services/purchases';
import { SubscriptionLegalFooter } from '../components/SubscriptionLegalFooter';
import { PaywallHero } from '../components/paywall/PaywallHero';
import { useServerFeatureFlags } from '../hooks/useServerFeatureFlags';
import { useLayout } from '../hooks/useLayout';
import { trialDaysFromServer, introOfferLabel, paywallPricePromoLabel, paywallReferenceMonthlyPrice } from '../utils/resolvedFeatureFlags';
import { captureRoutesEnabled } from '../navigation/screenshotNavigation';
import { openIosManageSubscriptions } from '../utils/manageSubscriptions';
import { trackSubscriptionActivated } from '../services/productAnalytics';
import type { RootStackParamList } from '../navigation/AppNavigator';

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
    price: PREMIUM_MONTHLY_PRICE_LABEL,
    period: '/month',
    features: [...PLAN_MATRIX.premium],
  },
];

type PaywallRoute = RouteProp<
  { Paywall: { emphasizeTier?: 'premium'; contextMessage?: string } },
  'Paywall'
>;

export const PaywallScreen: React.FC = () => {
  const route = useRoute<PaywallRoute>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const emphasizeTier = route.params?.emphasizeTier;
  const contextMessage = route.params?.contextMessage;
  const contextBannerText =
    contextMessage ??
    (emphasizeTier === 'premium'
      ? 'Premium unlocks unlimited picks, analysis, challenges, leaderboards, and in-play updates.'
      : undefined);

  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const reduxTier = useAppSelector((s) => s.auth.user?.subscriptionTier ?? 'free');
  const guestPreview = !isAuthenticated;
  const screenshotGuest = captureRoutesEnabled() && guestPreview;

  const [currentTier, setCurrentTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [packages, setPackages] = useState<OfferingPackage[]>([]);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const scrollRef = useRef<ScrollView>(null);
  const serverFlags = useServerFeatureFlags();
  const { isWide, contentMaxWidth, horizontalPadding } = useLayout();
  const trialDays = trialDaysFromServer(serverFlags);
  const introOfferText = introOfferLabel(serverFlags);
  const pricePromoText = paywallPricePromoLabel(serverFlags);
  const referenceMonthlyPrice = paywallReferenceMonthlyPrice(serverFlags);

  // Store billing (App Store / Play Billing via RevenueCat) is the compliant
  // path when the native SDK + a configured offering are present; otherwise we
  // fall back to web (Stripe) checkout.
  const storeBillingReady = isPurchasesAvailable() && packages.length > 0;

  const loadOfferings = useCallback(async () => {
    if (!isPurchasesAvailable()) {
      setOfferingsError('In-app purchases are not configured in this build.');
      setPackages([]);
      return;
    }
    const pkgs = await getOfferingPackages();
    setPackages(pkgs.filter((p) => p.tier === 'premium'));
    setOfferingsError(pkgs.length ? null : getLastOfferingsError());
  }, []);

  useEffect(() => {
    if (!isPurchasesAvailable()) return;
    void loadOfferings();
  }, [loadOfferings]);

  useFocusEffect(
    useCallback(() => {
      if (isPurchasesAvailable() && packages.length === 0) {
        void loadOfferings();
      }
    }, [loadOfferings, packages.length]),
  );

  const applyTier = useCallback(
    (tier: NormalizedTier, source: 'iap' | 'restore' | 'stripe' = 'iap') => {
      dispatch(setSubscriptionTier(tier));
      setCurrentTier(tier);
      if (tier !== 'free') {
        void trackSubscriptionActivated(tier, source);
      }
      void dispatch(fetchUserProfile())
        .unwrap()
        .then((info) => setCurrentTier(normalizeSubscriptionTier(info.subscription_tier)))
        .catch(() => {});
    },
    [dispatch],
  );

  const loadTier = useCallback(async () => {
    if (screenshotGuest) {
      setLoadError(null);
      setCurrentTier('free');
      setLoading(false);
      return;
    }
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
  }, [dispatch, reduxTier, screenshotGuest]);

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

  useEffect(() => {
    if (!captureRoutesEnabled() || loading) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 500);
    return () => clearTimeout(t);
  }, [loading]);

  const purchaseViaStore = useCallback(
    async (tierId: 'premium'): Promise<boolean> => {
      const pkg = packages.find((p) => p.tier === tierId && p.billingPeriod === billingPeriod);
      if (!pkg) return false;
      const res = await purchasePackage(pkg.raw);
      if (res.cancelled) return true;
      if (res.tier !== 'free') {
        applyTier(res.tier, 'iap');
      } else {
        Alert.alert(
          'Purchase',
          'Purchase went through but no plan is active yet. Tap "Restore purchases" in a moment.',
        );
      }
      return true;
    },
    [packages, applyTier, billingPeriod],
  );

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const tier = await restorePurchases();
      if (tier !== 'free') {
        applyTier(tier, 'restore');
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

  const handleSubscribe = useCallback(
    async (tierId: string) => {
      if (tierId !== 'premium') return;
      if (guestPreview) {
        Alert.alert(
          'Create an account',
          'Sign in or register to start your 7-day free trial.',
          [
            { text: 'Create account', onPress: () => navigation.navigate('Register') },
            { text: 'Sign in', onPress: () => navigation.navigate('Login') },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }
      setCheckoutLoadingTier(tierId);
      try {
        // Preferred: in-app purchase via the store (App Store / Play Billing).
        if (storeBillingReady) {
          const handled = await purchaseViaStore(tierId);
          if (handled) return;
        }
        if (Platform.OS === 'ios') {
          const detail = offeringsError
            ? `\n\n${offeringsError}`
            : '\n\nSubscription plans could not be loaded from the App Store. Confirm Premium Monthly is Ready to Submit in App Store Connect and linked in RevenueCat.';
          Alert.alert(
            'Subscriptions',
            `In-app purchase is not available right now. Check your connection and try Restore purchases.${detail}`,
            [
              { text: 'Restore purchases', onPress: () => void handleRestore() },
              { text: 'Retry', onPress: () => void loadOfferings() },
              { text: 'OK', style: 'cancel' },
            ],
          );
          return;
        }
        // Web / Android fallback: Stripe checkout when store billing unavailable.
        const { url } = await withTimeout(
          apiService.createCheckoutSession(tierId, billingPeriod),
          CHECKOUT_TIMEOUT_MS,
        );
        if (!url) {
          Alert.alert('Checkout', 'Checkout URL missing. Payments may not be configured yet.');
          return;
        }
        setCheckoutLoadingTier(null);
        await WebBrowser.openBrowserAsync(url);
        const info = await dispatch(fetchUserProfile()).unwrap();
        const tier = normalizeSubscriptionTier(info.subscription_tier);
        setCurrentTier(tier);
        if (tier !== 'free') {
          void trackSubscriptionActivated(tier, 'stripe');
        }
      } catch (e) {
        Alert.alert('Checkout', getUserFriendlyMessage(e));
      } finally {
        setCheckoutLoadingTier(null);
      }
    },
    [storeBillingReady, purchaseViaStore, dispatch, offeringsError, loadOfferings, handleRestore, guestPreview, navigation, billingPeriod],
  );

  const monthlyPkg = packages.find((p) => p.tier === 'premium' && p.billingPeriod === 'monthly');
  const annualPkg = packages.find((p) => p.tier === 'premium' && p.billingPeriod === 'annual');
  /** Hide annual until ASC + RevenueCat product exists (avoid review mismatch on iOS IAP). */
  const annualBillingAvailable = !storeBillingReady || Boolean(annualPkg);

  useEffect(() => {
    if (!annualBillingAvailable && billingPeriod === 'annual') {
      setBillingPeriod('monthly');
    }
  }, [annualBillingAvailable, billingPeriod]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const appVersion =
    Constants.expoConfig?.version ?? (Constants as { nativeAppVersion?: string }).nativeAppVersion ?? '—';

  const storePremiumMonthlyPrice = monthlyPkg?.priceString;
  const storePremiumAnnualPrice = annualPkg?.priceString;
  const premiumDisplayPrice =
    billingPeriod === 'annual'
      ? displayPremiumAnnualPrice(storePremiumAnnualPrice)
      : displayPremiumMonthlyPrice(storePremiumMonthlyPrice);
  const premiumDisplayPeriod = billingPeriod === 'annual' ? '/year' : '/month';
  const annualSavingsPct = premiumAnnualSavingsPercent();

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isWide && { paddingHorizontal: horizontalPadding, alignItems: 'center' },
      ]}
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
      {guestPreview ? (
        <View style={styles.guestPreviewBanner}>
          <Text style={styles.guestPreviewText}>
            Preview Premium plans — create a free account to subscribe and start your trial.
          </Text>
        </View>
      ) : null}
      <View style={isWide ? { width: contentMaxWidth, alignSelf: 'center' } : undefined}>
      <PaywallHero serverFlags={serverFlags} />
      {introOfferText ? (
        <View style={styles.introOfferBanner}>
          <Text style={styles.introOfferText}>{introOfferText}</Text>
        </View>
      ) : null}
      {pricePromoText ? (
        <View style={styles.pricePromoBanner} testID="paywall-price-promo">
          <Text style={styles.pricePromoText}>{pricePromoText}</Text>
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

      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[styles.billingOption, billingPeriod === 'monthly' && styles.billingOptionActive]}
          onPress={() => setBillingPeriod('monthly')}
          accessibilityRole="button"
          accessibilityState={{ selected: billingPeriod === 'monthly' }}
          accessibilityLabel="Monthly billing"
        >
          <Text
            style={[
              styles.billingOptionText,
              billingPeriod === 'monthly' && styles.billingOptionTextActive,
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
        {annualBillingAvailable ? (
          <TouchableOpacity
            style={[styles.billingOption, billingPeriod === 'annual' && styles.billingOptionActive]}
            onPress={() => setBillingPeriod('annual')}
            accessibilityRole="button"
            accessibilityState={{ selected: billingPeriod === 'annual' }}
            accessibilityLabel="Annual billing"
          >
            <Text
              style={[
                styles.billingOptionText,
                billingPeriod === 'annual' && styles.billingOptionTextActive,
              ]}
            >
              Annual
            </Text>
            <Text style={styles.billingSavings}>Save {annualSavingsPct}%</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {TIERS.map((tier) => {
        const isCurrent =
          currentTier === tier.id ||
          (tier.id === 'premium' && currentTier === 'premium_plus');
        const isPaid = tier.id !== 'free';
        const loadingThis = checkoutLoadingTier === tier.id;
        const showSubscribe = isPaid && !isCurrent;
        const displayPrice =
          tier.id === 'premium'
            ? premiumDisplayPrice
            : tier.price;
        const displayPeriod = tier.id === 'premium' ? premiumDisplayPeriod : tier.period;
        const subscribeLabel =
          tier.id === 'premium' && billingPeriod === 'annual'
            ? 'Subscribe annual'
            : guestPreview
              ? 'Sign up for free trial'
              : `Start ${trialDays}-day free trial`;

        const cardBody = (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <View style={styles.priceRow}>
                {tier.id === 'premium' && referenceMonthlyPrice && billingPeriod === 'monthly' ? (
                  <Text style={styles.referencePrice}>{referenceMonthlyPrice}</Text>
                ) : null}
                <Text style={styles.price}>{displayPrice}</Text>
                <Text style={styles.period}>{displayPeriod}</Text>
              </View>
              {tier.id === 'premium' && billingPeriod === 'annual' ? (
                <Text style={styles.annualHint}>
                  {PREMIUM_ANNUAL_PRICE_LABEL}/year vs {PREMIUM_MONTHLY_PRICE_LABEL}/mo monthly
                </Text>
              ) : null}
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
              <View style={[styles.cta, isCurrent && styles.ctaCurrent]}>
                {loadingThis ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={[styles.ctaText, isCurrent && styles.ctaTextCurrent]}>
                    {isCurrent
                      ? 'Current plan'
                      : subscribeLabel}
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
              testID={tier.id === 'premium' ? 'paywall-premium-card' : undefined}
              accessibilityRole="button"
              accessibilityLabel={`Subscribe to Premium with ${trialDays}-day free trial`}
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

      {Platform.OS === 'ios' && currentTier !== 'free' ? (
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => void openIosManageSubscriptions()}
          accessibilityRole="button"
          accessibilityLabel="Manage subscription in App Store"
        >
          <Text style={styles.manageButtonText}>Manage subscription in App Store</Text>
        </TouchableOpacity>
      ) : null}
      </View>

      <SubscriptionLegalFooter
        plans={[
          {
            title: 'Premium Monthly',
            lengthLabel: '1 month',
            priceLabel: premiumMonthlyPriceWithPeriod(storePremiumMonthlyPrice),
            trialNote: `${trialDays}-day free trial for eligible new subscribers, then auto-renews`,
          },
          ...(annualBillingAvailable
            ? [
                {
                  title: 'Premium Annual',
                  lengthLabel: '1 year',
                  priceLabel: premiumAnnualPriceWithPeriod(storePremiumAnnualPrice),
                },
              ]
            : []),
        ]}
      />
      {!storeBillingReady && Platform.OS !== 'ios' ? (
        <Text style={styles.footer}>
          Web checkout uses Stripe when in-app purchase is unavailable. Return to Subscription after
          payment to refresh your plan.
        </Text>
      ) : null}
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
  billingToggle: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  billingOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
  },
  billingOptionActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentDim,
  },
  billingOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  billingOptionTextActive: {
    color: theme.colors.text,
  },
  billingSavings: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
    marginTop: 2,
  },
  annualHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
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
  guestPreviewBanner: {
    backgroundColor: theme.colors.backgroundElevated,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  guestPreviewText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  introOfferBanner: {
    backgroundColor: theme.colors.secondaryDim,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  introOfferText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  pricePromoBanner: {
    backgroundColor: theme.colors.accentDim,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  pricePromoText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
    textAlign: 'center',
  },
  referencePrice: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
    marginRight: theme.spacing.xs,
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
  manageButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
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

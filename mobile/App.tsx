/**
 * Main App Component
 */
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Linking, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

if (process.env.EXPO_PUBLIC_HIDE_DEV_UI === 'true') {
  LogBox.ignoreAllLogs(true);
}
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { initializeGoogleMobileAds } from './src/ads/native/loadGma';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from './src/store/store';
import { queryClient } from './src/query/queryClient';
import { AppNavigator } from './src/navigation/AppNavigator';
import { handleScreenshotDeepLink } from './src/navigation/screenshotNavigation';
import { LaunchScreen } from './src/components/LaunchScreen';
import { OfflineBanner } from './src/components/OfflineBanner';
import { getStoredAuth } from './src/utils/authStorage';
import { setAuthToken, setOnUnauthorized, setOnAccessTokenRefreshed } from './src/services/api';
import { setUser, fetchUserProfile, setSubscriptionTier } from './src/store/slices/authSlice';
import { signOut } from './src/utils/signOut';
import {
  configurePurchases,
  addEntitlementListener,
} from './src/services/purchases';
import { syncPushRegistrationAfterConsent } from './src/utils/pushNotifications';
import {
  configurePushNotificationPresentation,
  subscribeToPushNotificationResponses,
} from './src/utils/pushNotificationHandlers';
import { recordAppLaunch } from './src/utils/storeReview';
import { trackAppOpened } from './src/services/productAnalytics';
import { fetchServerFeatureFlags } from './src/hooks/useServerFeatureFlags';
import { canInitializeAdsSdk, canSendAnalytics } from './src/utils/privacyPreferences';
import { RewardedUnlockProvider } from './src/ads/engine/RewardedUnlockContext';
import { AdEngineProvider } from './src/ads/engine/AdEngineContext';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go may not support native splash */
});

/** Close Stripe Checkout auth session cleanly when returning via `octobetiq://payment/*`. */
WebBrowser.maybeCompleteAuthSession();

configurePushNotificationPresentation();

function AppContent() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (!appReady) return;
    void recordAppLaunch();
    void (async () => {
      if (await canSendAnalytics()) {
        await trackAppOpened();
      }
    })();
    return subscribeToPushNotificationResponses();
  }, [appReady]);

  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut(store.dispatch);
    });
    setOnAccessTokenRefreshed((p) => {
      store.dispatch(setUser({ email: p.email, token: p.accessToken }));
      store.dispatch(fetchUserProfile());
    });
    return () => {
      setOnUnauthorized(null);
      setOnAccessTokenRefreshed(null);
    };
  }, []);

  useEffect(() => {
    const onUrl = ({ url }: { url: string }) => {
      const u = url.toLowerCase();
      void handleScreenshotDeepLink(url).then((handled) => {
        if (handled) return;
        if (
          u.includes('payment/success') ||
          u.includes('checkout/success') ||
          u.includes('payment/cancel') ||
          u.includes('checkout/cancel')
        ) {
          void store.dispatch(fetchUserProfile());
        }
      });
    };
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((initial) => {
      if (initial) onUrl({ url: initial });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubEntitlements = () => {};
    let unsubStore = () => {};
    (async () => {
      try {
        const auth = await getStoredAuth();
        if (!cancelled && auth) {
          setAuthToken(auth.accessToken);
          store.dispatch(setUser({ email: auth.email, token: auth.accessToken }));
          store.dispatch(fetchUserProfile());
          void syncPushRegistrationAfterConsent();
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          setAppReady(true);
          await SplashScreen.hideAsync().catch(() => {});
          void fetchServerFeatureFlags();
        }
      }
      if (cancelled) return;

      // Defer native SDK init until after first paint + privacy consent.
      void (async () => {
        if (await canInitializeAdsSdk()) {
          await initializeGoogleMobileAds();
        }
      })();
      let lastUserId = store.getState().auth.user?.id ?? '';
      await configurePurchases(lastUserId || undefined);
      unsubEntitlements = addEntitlementListener((tier) => {
        if (tier !== 'free') store.dispatch(setSubscriptionTier(tier));
      });
      unsubStore = store.subscribe(() => {
        const auth = store.getState().auth;
        const id = auth.user?.id ?? '';
        if (id && id !== lastUserId) {
          lastUserId = id;
          void configurePurchases(id);
        } else if (!auth.isAuthenticated && lastUserId) {
          lastUserId = '';
        }
      });
    })();
    return () => {
      cancelled = true;
      unsubEntitlements();
      unsubStore();
    };
  }, []);

  if (!appReady) {
    return <LaunchScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <AppNavigator />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <RewardedUnlockProvider>
            <AdEngineProvider>
              <AppContent />
            </AdEngineProvider>
          </RewardedUnlockProvider>
        </Provider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

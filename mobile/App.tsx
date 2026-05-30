/**
 * Main App Component
 */
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { initializeGoogleMobileAds } from './src/ads/native/loadGma';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LaunchScreen } from './src/components/LaunchScreen';
import { getStoredAuth } from './src/utils/authStorage';
import { setAuthToken, setOnUnauthorized, setOnAccessTokenRefreshed } from './src/services/api';
import { setUser, logout, fetchUserProfile, setSubscriptionTier } from './src/store/slices/authSlice';
import {
  configurePurchases,
  logOutPurchases,
  addEntitlementListener,
} from './src/services/purchases';
import { registerPushTokenIfPossible } from './src/utils/pushNotifications';
import { getPushNotificationsEnabled } from './src/utils/settingsStorage';
import { RewardedUnlockProvider } from './src/ads/engine/RewardedUnlockContext';
import { AdEngineProvider } from './src/ads/engine/AdEngineContext';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go may not support native splash */
});

/** Close Stripe Checkout auth session cleanly when returning via `octobetiq://payment/*`. */
WebBrowser.maybeCompleteAuthSession();

function AppContent() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => {
      store.dispatch(logout());
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
      if (
        u.includes('payment/success') ||
        u.includes('checkout/success') ||
        u.includes('payment/cancel') ||
        u.includes('checkout/cancel')
      ) {
        void store.dispatch(fetchUserProfile());
      }
    };
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((initial) => {
      if (initial) onUrl({ url: initial });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await getStoredAuth();
        if (!cancelled && auth) {
          setAuthToken(auth.accessToken);
          store.dispatch(setUser({ email: auth.email, token: auth.accessToken }));
          store.dispatch(fetchUserProfile());
          const pushEnabled = await getPushNotificationsEnabled();
          if (pushEnabled) registerPushTokenIfPossible();
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          setAppReady(true);
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!appReady) {
    return <LaunchScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  useEffect(() => {
    void initializeGoogleMobileAds();

    // RevenueCat: configure, associate the signed-in user, and mirror store
    // entitlements into Redux so a completed purchase unlocks access immediately.
    let unsubEntitlements = () => {};
    let lastUserId = store.getState().auth.user?.id ?? '';
    (async () => {
      await configurePurchases(lastUserId || undefined);
      unsubEntitlements = addEntitlementListener((tier) => {
        if (tier !== 'free') store.dispatch(setSubscriptionTier(tier));
      });
    })();

    const unsubStore = store.subscribe(() => {
      const auth = store.getState().auth;
      const id = auth.user?.id ?? '';
      if (id && id !== lastUserId) {
        lastUserId = id;
        void configurePurchases(id);
      } else if (!auth.isAuthenticated && lastUserId) {
        lastUserId = '';
        void logOutPurchases();
      }
    });

    return () => {
      unsubEntitlements();
      unsubStore();
    };
  }, []);

  return (
    <Provider store={store}>
      <RewardedUnlockProvider>
        <AdEngineProvider>
          <AppContent />
        </AdEngineProvider>
      </RewardedUnlockProvider>
    </Provider>
  );
}

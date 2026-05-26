/**
 * Main App Component
 */
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { initializeGoogleMobileAds } from './src/ads/native/loadGma';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LaunchScreen } from './src/components/LaunchScreen';
import { getStoredAuth } from './src/utils/authStorage';
import { setAuthToken, setOnUnauthorized, setOnAccessTokenRefreshed } from './src/services/api';
import { setUser, logout, fetchUserProfile } from './src/store/slices/authSlice';
import { registerPushTokenIfPossible } from './src/utils/pushNotifications';
import { getPushNotificationsEnabled } from './src/utils/settingsStorage';
import { RewardedUnlockProvider } from './src/ads/engine/RewardedUnlockContext';
import { AdEngineProvider } from './src/ads/engine/AdEngineContext';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go may not support native splash */
});

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

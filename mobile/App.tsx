/**
 * Main App Component
 */
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeGoogleMobileAds } from './src/ads/native/loadGma';
import { Provider } from 'react-redux';
import { theme } from './src/constants/theme';
import { store } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { getStoredAuth } from './src/utils/authStorage';
import { setAuthToken, setOnUnauthorized, setOnAccessTokenRefreshed } from './src/services/api';
import { setUser, logout, fetchUserProfile } from './src/store/slices/authSlice';
import { registerPushTokenIfPossible } from './src/utils/pushNotifications';
import { getPushNotificationsEnabled } from './src/utils/settingsStorage';
import { RewardedUnlockProvider } from './src/ads/engine/RewardedUnlockContext';
import { AdEngineProvider } from './src/ads/engine/AdEngineContext';

function AppContent() {
  const [isRestoring, setIsRestoring] = useState(true);

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
        if (!cancelled) setIsRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isRestoring) {
    return (
      <View style={styles.restoring}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.restoringText}>Loading...</Text>
      </View>
    );
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

const styles = StyleSheet.create({
  restoring: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  restoringText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textMuted,
  },
});

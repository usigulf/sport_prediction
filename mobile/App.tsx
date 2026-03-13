/**
 * Main App Component
 */
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { theme } from './src/constants/theme';
import { store } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { getStoredAuth } from './src/utils/authStorage';
import { setAuthToken, setOnUnauthorized } from './src/services/api';
import { setUser, logout } from './src/store/slices/authSlice';
import { registerPushTokenIfPossible } from './src/utils/pushNotifications';
import { getPushNotificationsEnabled } from './src/utils/settingsStorage';

function AppContent() {
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    setOnUnauthorized(() => {
      store.dispatch(logout());
    });
    return () => setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await getStoredAuth();
        if (!cancelled && auth) {
          setAuthToken(auth.accessToken);
          store.dispatch(setUser({ email: auth.email, token: auth.accessToken }));
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
  return (
    <Provider store={store}>
      <AppContent />
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

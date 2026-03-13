import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiService, setAuthToken, checkBackendHealth } from '../services/api';
import { setStoredAuth } from '../utils/authStorage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch } from '../store/hooks';
import { setUser } from '../store/slices/authSlice';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { registerPushTokenIfPossible } from '../utils/pushNotifications';
import { getPushNotificationsEnabled } from '../utils/settingsStorage';
import { theme } from '../constants/theme';
import { OctobetWordmark } from '../components/OctobetWordmark';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{ ok: boolean; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkBackendHealth().then((r) => {
      if (!cancelled) setBackendStatus(r);
    });
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login(email, password);
      setAuthToken(response.access_token);
      dispatch(setUser({ email, token: response.access_token }));
      await setStoredAuth({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        email,
      });

      const pushEnabled = await getPushNotificationsEnabled();
      if (pushEnabled) registerPushTokenIfPossible();
      // Auth state update causes AppNavigator to show the authenticated stack (MainTabs)
    } catch (error: any) {
      const msg = getUserFriendlyMessage(error);
      const hint = msg.includes('reach') || msg.includes('timed out')
        ? '\n\nStart backend: cd backend && ./run.sh'
        : '.\n\nIf you don\'t have an account, tap Sign Up.';
      Alert.alert('Login Failed', msg + hint);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <OctobetWordmark variant="title" style={styles.title} />
        <Text style={styles.subtitle}>AI-Powered Predictions</Text>

        {backendStatus && (
          <View style={styles.backendStatus}>
            <Text style={[styles.backendStatusText, backendStatus.ok ? styles.backendOk : styles.backendFail]}>
              {backendStatus.ok ? '✓ Backend connected' : '✗ Backend not reachable'}
            </Text>
            <Text style={styles.backendUrl}>{backendStatus.url}</Text>
            {!backendStatus.ok && (
              <Text style={styles.backendHint}>
                1) Start backend: cd backend && ./run.sh{'\n'}
                2) In mobile/.env set EXPO_PUBLIC_API_URL={backendStatus.url}/api/v1 (try :8000 or :8001 to match backend){'\n'}
                3) Restart Expo. On a device, allow firewall for port 8000/8001.
              </Text>
            )}
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  backendStatus: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm + 4,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backendStatusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  backendOk: { color: theme.colors.accent },
  backendFail: { color: theme.colors.secondary },
  backendUrl: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  backendHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    fontSize: 16,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  linkText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  linkTextBold: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
});

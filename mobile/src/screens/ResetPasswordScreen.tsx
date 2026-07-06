import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch } from '../store/hooks';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { completeSignInWithTokens } from '../utils/signIn';
import { theme } from '../constants/theme';
import { OctobetiQWordmark } from '../components/OctobetiQWordmark';

type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;
type ResetPasswordNavigationProp = StackNavigationProp<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordNavigationProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const dispatch = useAppDispatch();
  const initialToken = useMemo(() => (route.params?.token ?? '').trim(), [route.params?.token]);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Reset token is missing. Open the link from your email or request a new reset.');
      return;
    }
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const tokens = await apiService.resetPassword(token.trim(), password);
      await completeSignInWithTokens(dispatch, tokens);
    } catch (error: unknown) {
      Alert.alert('Reset Failed', getUserFriendlyMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.content}>
          <OctobetiQWordmark variant="title" style={styles.title} />
          <Text style={styles.subtitle}>Choose a new password for your account.</Text>

          <View style={styles.form}>
            {!initialToken ? (
              <TextInput
                style={styles.input}
                placeholder="Reset token"
                placeholderTextColor={theme.colors.textMuted}
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                loading && styles.buttonDisabled,
                pressed && !loading && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.linkText}>Request a new reset link</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
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
  buttonPressed: {
    opacity: 0.9,
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
  linkPressed: {
    opacity: 0.7,
  },
  linkText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});

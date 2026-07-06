import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';
import { OctobetiQWordmark } from '../components/OctobetiQWordmark';

type ForgotPasswordNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): boolean => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required');
      return false;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Please enter a valid email');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiService.forgotPassword(email.trim());
    } catch {
      // Always show success to prevent email enumeration.
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={40} color={theme.colors.accent} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successBody}>
            If an account exists for {email.trim()}, we sent password reset instructions to that address.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryLink, pressed && styles.linkPressed]}
            onPress={() => {
              setSubmitted(false);
              setEmail('');
            }}
          >
            <Text style={styles.linkText}>Try a different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.backRow, pressed && styles.linkPressed]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <OctobetiQWordmark variant="title" style={styles.title} />
          <Text style={styles.subtitle}>
            Enter your email and we&apos;ll send reset instructions if an account exists.
          </Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Remember your password? <Text style={styles.linkTextBold}>Sign In</Text>
              </Text>
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
  successContent: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    minHeight: theme.minTouchSize,
  },
  backText: {
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    fontSize: 16,
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
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: theme.colors.secondary,
  },
  errorText: {
    color: theme.colors.secondary,
    fontSize: 12,
    marginBottom: theme.spacing.md,
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
  secondaryLink: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  linkPressed: {
    opacity: 0.7,
  },
  linkText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  linkTextBold: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});

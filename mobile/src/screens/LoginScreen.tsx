import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch } from '../store/hooks';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { completeSignIn } from '../utils/signIn';
import { theme } from '../constants/theme';
import { AUTH_SCREEN_TAGLINE } from '../constants/leagues';
import { OctobetiQWordmark } from '../components/OctobetiQWordmark';
import { AuthTrustLinks } from '../components/AuthTrustLinks';
import { AppleSignInButton, AuthMethodDivider } from '../components/AppleSignInButton';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const formDisabled = loading || appleBusy;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await completeSignIn(dispatch, email, password);
    } catch (error: any) {
      const msg = getUserFriendlyMessage(error);
      const hint = msg.includes('reach') || msg.includes('timed out')
        ? ''
        : '\n\nIf you don\'t have an account, tap Sign Up.';
      Alert.alert('Login Failed', msg + hint);
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
        <Text style={styles.subtitle}>{AUTH_SCREEN_TAGLINE}</Text>

        <View style={styles.form}>
          <AppleSignInButton disabled={formDisabled} onBusyChange={setAppleBusy} />
          <AuthMethodDivider />

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

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              loading && styles.buttonDisabled,
              pressed && !loading && styles.buttonPressed,
            ]}
            onPress={handleLogin}
            disabled={formDisabled}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </Pressable>

          <AuthTrustLinks />
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
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  linkTextBold: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
});

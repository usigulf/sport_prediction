/**
 * Sign in with Apple — native iOS button + backend token exchange.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { theme } from '../constants/theme';
import { useAppDispatch } from '../store/hooks';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { completeAppleSignIn } from '../utils/signIn';

type Props = {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

export function AppleSignInButton({ disabled = false, onBusyChange }: Props) {
  const dispatch = useAppDispatch();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  const handlePress = useCallback(async () => {
    if (disabled) return;
    onBusyChange?.(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return a sign-in token. Try again or use email.');
      }
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
            .trim()
        : undefined;
      await completeAppleSignIn(dispatch, {
        identityToken: credential.identityToken,
        email: credential.email ?? undefined,
        fullName: fullName || undefined,
      });
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple Sign In Failed', getUserFriendlyMessage(error));
    } finally {
      onBusyChange?.(false);
    }
  }, [disabled, dispatch, onBusyChange]);

  if (Platform.OS !== 'ios' || !available) return null;

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={theme.radii.lg}
        style={styles.button}
        onPress={handlePress}
      />
    </View>
  );
}

export function AuthMethodDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  button: {
    width: '100%',
    height: theme.minTouchSize,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.borderSubtle,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textMuted,
    textTransform: 'lowercase',
  },
});

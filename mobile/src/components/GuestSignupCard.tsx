import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList>;

interface GuestSignupCardProps {
  title?: string;
  message?: string;
  compact?: boolean;
}

export const GuestSignupCard: React.FC<GuestSignupCardProps> = ({
  title = 'Create a free account',
  message = 'Sign up to unlock full predictions, game analysis, favorites, and live updates.',
  compact = false,
}) => {
  const navigation = useNavigation<Nav>();

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.primaryBtnText}>Get started free</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.linkText}>
          Already have an account? <Text style={styles.linkBold}>Sign in</Text>
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  cardCompact: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  primaryBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryBtnText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  linkBtn: {
    alignItems: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  linkBold: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
  pressed: {
    opacity: 0.85,
  },
});

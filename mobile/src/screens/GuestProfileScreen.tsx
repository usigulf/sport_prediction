import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';
import { OctobetiQWordmark } from '../components/OctobetiQWordmark';
import { AuthTrustLinks } from '../components/AuthTrustLinks';
import { PredictionDisclaimer } from '../components/PredictionDisclaimer';
import { useLayout } from '../hooks/useLayout';
import { GUEST_TEASER_PICK_LIMIT } from '../constants/guestBrowse';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  StackNavigationProp<RootStackParamList>
>;

export const GuestProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { isWide, contentMaxWidth, horizontalPadding } = useLayout();
  const contentStyle = useMemo(
    () => (isWide ? { width: contentMaxWidth, alignSelf: 'center' as const } : undefined),
    [isWide, contentMaxWidth],
  );

  return (
    <ScrollView
      style={styles.container}
      testID="guest-profile-screen"
      contentContainerStyle={[
        styles.content,
        isWide && { paddingHorizontal: horizontalPadding + theme.spacing.lg },
      ]}
    >
      <View style={contentStyle}>
      <OctobetiQWordmark variant="title" style={styles.wordmark} />
      <Text style={styles.subtitle}>
        Browse schedules and {GUEST_TEASER_PICK_LIMIT} free picks daily. Create an account for full access.
      </Text>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Register')}
        testID="guest-create-account"
      >
        <Text style={styles.primaryBtnText}>Create free account</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Login')}
        testID="guest-sign-in"
      >
        <Text style={styles.secondaryBtnText}>Sign in</Text>
      </Pressable>

      <View style={styles.menu}>
        <MenuRow
          icon="diamond-outline"
          label="View Premium plans"
          testID="guest-view-premium"
          onPress={() =>
            navigation.navigate('Paywall', {
              emphasizeTier: 'premium',
              contextMessage: 'Premium unlocks unlimited picks, analysis, and live updates.',
            })
          }
        />
        <MenuRow icon="stats-chart-outline" label="Model accuracy" onPress={() => navigation.navigate('Accuracy')} />
        <MenuRow icon="help-circle-outline" label="Help & FAQ" onPress={() => navigation.navigate('Help')} />
        <MenuRow icon="information-circle-outline" label="About octobetiQ" onPress={() => navigation.navigate('Landing')} />
      </View>

      <AuthTrustLinks />
      <PredictionDisclaimer compact style={styles.disclaimer} />
      </View>
    </ScrollView>
  );
};

function MenuRow({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
      onPress={onPress}
      testID={testID}
    >
      <Ionicons name={icon} size={20} color={theme.colors.accent} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  wordmark: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  primaryBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
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
  secondaryBtn: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  menu: {
    marginBottom: theme.spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderSubtle,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
  disclaimer: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});

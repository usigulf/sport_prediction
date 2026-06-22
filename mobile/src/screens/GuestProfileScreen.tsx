import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';
import { OctobetiQWordmark } from '../components/OctobetiQWordmark';
import { AuthTrustLinks } from '../components/AuthTrustLinks';
import { GUEST_TEASER_PICK_LIMIT } from '../constants/guestBrowse';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  StackNavigationProp<RootStackParamList>
>;

export const GuestProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <OctobetiQWordmark variant="title" style={styles.wordmark} />
      <Text style={styles.subtitle}>
        Browse schedules and {GUEST_TEASER_PICK_LIMIT} free picks daily. Create an account for full access.
      </Text>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.primaryBtnText}>Create free account</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.secondaryBtnText}>Sign in</Text>
      </Pressable>

      <View style={styles.menu}>
        <MenuRow icon="stats-chart-outline" label="Model accuracy" onPress={() => navigation.navigate('Accuracy')} />
        <MenuRow icon="help-circle-outline" label="Help & FAQ" onPress={() => navigation.navigate('Help')} />
        <MenuRow icon="information-circle-outline" label="About octobetiQ" onPress={() => navigation.navigate('Landing')} />
      </View>

      <AuthTrustLinks />
    </ScrollView>
  );
};

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
      onPress={onPress}
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
});

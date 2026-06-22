/**
 * First-run onboarding: choose favorite leagues for Best Picks and Favorites.
 * Shown once after login/register; Save syncs to backend, Skip completes without adding leagues.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { AVAILABLE_LEAGUES, ONBOARDING_LEAGUES_SUBTITLE } from '../constants/leagues';
import { apiService } from '../services/api';
import { setOnboardingComplete } from '../utils/onboardingStorage';
import { getUserFriendlyMessage } from '../utils/errorMessages';

export function OnboardingScreen() {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const finishOnboarding = useCallback(() => {
    void setOnboardingComplete().catch(() => {});
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }),
    );
  }, [navigation]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const leagues = [...selected];
    try {
      await Promise.all(
        leagues.map((leagueId) =>
          apiService.addFavoriteLeague(leagueId).catch(() => undefined),
        ),
      );
    } catch (error) {
      Alert.alert('Could not save leagues', getUserFriendlyMessage(error));
      setSaving(false);
      return;
    }
    finishOnboarding();
    setSaving(false);
  };

  const handleSkip = () => {
    if (saving) return;
    setSaving(true);
    finishOnboarding();
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Choose your leagues</Text>
        <Text style={styles.subtitle}>{ONBOARDING_LEAGUES_SUBTITLE}</Text>
        <View style={styles.chips}>
          {AVAILABLE_LEAGUES.map((league) => {
            const isSelected = selected.has(league.id);
            return (
              <Pressable
                key={league.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => toggle(league.id)}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && styles.chipSelected,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {league.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.primaryButton,
            saving && styles.buttonDisabled,
            pressed && !saving && styles.primaryPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {selected.size > 0
                ? `Save ${selected.size} league${selected.size === 1 ? '' : 's'}`
                : 'Continue'}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={handleSkip}
          style={({ pressed }) => [styles.skipButton, pressed && !saving && styles.skipPressed]}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: theme.colors.accentDim,
    borderColor: theme.colors.accent,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.background,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  primaryPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  skipButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  skipPressed: {
    opacity: 0.7,
  },
  skipText: {
    fontSize: 15,
    color: theme.colors.textMuted,
  },
});

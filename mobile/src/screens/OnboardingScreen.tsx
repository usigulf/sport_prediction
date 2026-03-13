/**
 * First-run onboarding: choose favorite leagues for Best Picks and Favorites.
 * Shown once after login/register; Save syncs to backend, Skip completes without adding leagues.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { AVAILABLE_LEAGUES } from '../constants/leagues';
import { apiService } from '../services/api';
import { setOnboardingComplete } from '../utils/onboardingStorage';
import { getUserFriendlyMessage } from '../utils/errorMessages';

export function OnboardingScreen() {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const leagueId of selected) {
        await apiService.addFavoriteLeague(leagueId);
      }
      await setOnboardingComplete();
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    } catch (error) {
      Alert.alert('Could not save leagues', getUserFriendlyMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await setOnboardingComplete();
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choose your leagues</Text>
        <Text style={styles.subtitle}>
          We'll use these for Best Picks and your Favorites. You can change them anytime in Favorites.
        </Text>
        <View style={styles.chips}>
          {AVAILABLE_LEAGUES.map((league) => {
            const isSelected = selected.has(league.id);
            return (
              <TouchableOpacity
                key={league.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggle(league.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {league.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {selected.size > 0 ? `Save ${selected.size} league${selected.size === 1 ? '' : 's'}` : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={saving}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
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
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.accentDim,
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  actions: {
    gap: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
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
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: theme.colors.textMuted,
  },
});

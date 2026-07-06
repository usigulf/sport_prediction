/**
 * First-run onboarding (3 steps): value → trust → leagues + optional push.
 * Shown once after login/register. Skip allowed on any step.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import {
  AVAILABLE_LEAGUES,
  ONBOARDING_LEAGUES_SUBTITLE,
  ONBOARDING_PUSH_HINT,
  ONBOARDING_TRUST_BODY,
  ONBOARDING_TRUST_TITLE,
  ONBOARDING_WELCOME_BODY,
  ONBOARDING_WELCOME_TITLE,
} from '../constants/leagues';
import { apiService } from '../services/api';
import { recordOnboardingEvent, setOnboardingComplete } from '../utils/onboardingStorage';
import { trackOnboardingCompleted } from '../services/productAnalytics';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { registerPushTokenIfPossible } from '../utils/pushNotifications';
import { setPushNotificationsEnabled } from '../utils/settingsStorage';

const STEP_COUNT = 3;

type StepIcon = React.ComponentProps<typeof Ionicons>['name'];

function StepDots({ step }: { step: number }) {
  return (
    <View style={styles.dots} accessibilityRole="progressbar">
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
      ))}
    </View>
  );
}

function ValueBullet({ icon, text }: { icon: StepIcon; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={22} color={theme.colors.accent} style={styles.bulletIcon} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export function OnboardingScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pushOptIn, setPushOptIn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void recordOnboardingEvent(0, 'view');
  }, []);

  useEffect(() => {
    if (step > 0) void recordOnboardingEvent(step, 'view');
  }, [step]);

  const finishOnboarding = useCallback(() => {
    void recordOnboardingEvent(step, 'complete');
    void trackOnboardingCompleted(pushOptIn);
    void setOnboardingComplete().catch(() => {});
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }),
    );
  }, [navigation, step, pushOptIn]);

  const toggleLeague = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyPushPreference = async () => {
    await setPushNotificationsEnabled(pushOptIn);
    if (pushOptIn) await registerPushTokenIfPossible({ requestPermission: true });
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    const leagues = [...selected];
    try {
      if (leagues.length > 0) {
        await Promise.all(
          leagues.map((leagueId) =>
            apiService.addFavoriteLeague(leagueId).catch(() => undefined),
          ),
        );
      }
      await applyPushPreference();
    } catch (error) {
      Alert.alert('Could not save preferences', getUserFriendlyMessage(error));
      setSaving(false);
      return;
    }
    finishOnboarding();
    setSaving(false);
  };

  const handleSkip = () => {
    if (saving) return;
    void recordOnboardingEvent(step, 'skip');
    setSaving(true);
    finishOnboarding();
    setSaving(false);
  };

  const handleNext = () => {
    if (saving) return;
    void recordOnboardingEvent(step, 'next');
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  };

  const primaryLabel =
    step < STEP_COUNT - 1
      ? 'Continue'
      : selected.size > 0
        ? `Get started · ${selected.size} league${selected.size === 1 ? '' : 's'}`
        : 'Get started';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <StepDots step={step} />
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={handleSkip}
          style={({ pressed }) => [styles.skipTop, pressed && !saving && styles.skipPressed]}
        >
          <Text style={styles.skipTopText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <View style={styles.slide}>
            <View style={styles.iconCircle}>
              <Ionicons name="football-outline" size={36} color={theme.colors.accent} />
            </View>
            <Text style={styles.title}>{ONBOARDING_WELCOME_TITLE}</Text>
            <Text style={styles.subtitle}>{ONBOARDING_WELCOME_BODY}</Text>
            <ValueBullet icon="analytics-outline" text="Daily AI picks with confidence scores" />
            <ValueBullet icon="calendar-outline" text="Schedules and live scores in one place" />
            <ValueBullet icon="shield-checkmark-outline" text="Informational analytics — not betting advice" />
          </View>
        )}

        {step === 1 && (
          <View style={styles.slide}>
            <View style={styles.iconCircle}>
              <Ionicons name="ribbon-outline" size={36} color={theme.colors.accent} />
            </View>
            <Text style={styles.title}>{ONBOARDING_TRUST_TITLE}</Text>
            <Text style={styles.subtitle}>{ONBOARDING_TRUST_BODY}</Text>
            <ValueBullet icon="lock-closed-outline" text="Pre-kickoff predictions only — no post-game edits" />
            <ValueBullet icon="stats-chart-outline" text="Accuracy tab shows hit rate and sample size" />
            <ValueBullet icon="document-text-outline" text="Methodology and data freshness notes in Help" />
          </View>
        )}

        {step === 2 && (
          <View style={styles.slide}>
            <Text style={styles.title}>Personalize your feed</Text>
            <Text style={styles.subtitle}>{ONBOARDING_LEAGUES_SUBTITLE}</Text>
            <View style={styles.chips}>
              {AVAILABLE_LEAGUES.map((league) => {
                const isSelected = selected.has(league.id);
                return (
                  <Pressable
                    key={league.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => toggleLeague(league.id)}
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

            <View style={styles.pushCard}>
              <View style={styles.pushRow}>
                <Ionicons name="notifications-outline" size={22} color={theme.colors.accent} />
                <Text style={styles.pushTitle}>Pick alerts</Text>
                <Switch
                  value={pushOptIn}
                  onValueChange={setPushOptIn}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accentDim }}
                  thumbColor={Platform.OS === 'android' ? theme.colors.accent : undefined}
                />
              </View>
              <Text style={styles.pushHint}>{ONBOARDING_PUSH_HINT}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={step < STEP_COUNT - 1 ? handleNext : handleFinish}
          style={({ pressed }) => [
            styles.primaryButton,
            saving && styles.buttonDisabled,
            pressed && !saving && styles.primaryPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.accent,
  },
  skipTop: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  skipTopText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  slide: {
    flexGrow: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
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
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  bulletIcon: {
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
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
  pushCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.md,
  },
  pushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pushTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pushHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
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
  skipPressed: {
    opacity: 0.7,
  },
});

/**
 * First-run activation onboarding (audit #14):
 * value → trust → favourite leagues → first trusted pick.
 * Skip allowed, but leagues step nudges for ≥1 selection.
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
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import {
  AVAILABLE_LEAGUES,
  ONBOARDING_FIRST_PICK_BODY,
  ONBOARDING_FIRST_PICK_TITLE,
  ONBOARDING_LEAGUES_SUBTITLE,
  ONBOARDING_PUSH_HINT,
  ONBOARDING_TRUST_BODY,
  ONBOARDING_TRUST_TITLE,
  ONBOARDING_WELCOME_BODY,
  ONBOARDING_WELCOME_TITLE,
} from '../constants/leagues';
import { apiService } from '../services/api';
import { recordOnboardingEvent, setOnboardingComplete } from '../utils/onboardingStorage';
import {
  setPendingFirstPrediction,
  setScorecardNudgePending,
} from '../utils/activationStorage';
import {
  trackFavouriteSelected,
  trackFirstPredictionOpened,
  trackOnboardingCompleted,
} from '../services/productAnalytics';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { registerPushTokenIfPossible } from '../utils/pushNotifications';
import { setPushNotificationsEnabled } from '../utils/settingsStorage';
import { soccerBetaFetchParams } from '../utils/soccerBetaFetch';
import { BestPickMiniCard, type BestPickItem } from '../components/BestPickMiniCard';
import { formatLeagueLabel } from '../utils/leagueDisplay';
import type { RootStackParamList } from '../navigation/AppNavigator';

const STEP_COUNT = 4;

type StepIcon = React.ComponentProps<typeof Ionicons>['name'];
type Nav = StackNavigationProp<RootStackParamList>;

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

function toBestPick(raw: {
  id: string;
  league?: string;
  home_team?: BestPickItem['home_team'] | { name?: string; logo_url?: string | null; abbreviation?: string | null } | null;
  away_team?: BestPickItem['away_team'] | { name?: string; logo_url?: string | null; abbreviation?: string | null } | null;
  prediction?: BestPickItem['prediction'];
  guest_locked?: boolean;
}): BestPickItem {
  return {
    id: String(raw.id),
    league: raw.league || '',
    home_team: raw.home_team?.name
      ? {
          name: raw.home_team.name,
          logo_url: raw.home_team.logo_url,
          abbreviation: raw.home_team.abbreviation,
        }
      : null,
    away_team: raw.away_team?.name
      ? {
          name: raw.away_team.name,
          logo_url: raw.away_team.logo_url,
          abbreviation: raw.away_team.abbreviation,
        }
      : null,
    prediction: raw.prediction,
    guest_locked: raw.guest_locked,
  };
}

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pushOptIn, setPushOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstPick, setFirstPick] = useState<BestPickItem | null>(null);
  const [pickLoading, setPickLoading] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [leaguesSaved, setLeaguesSaved] = useState(false);

  useEffect(() => {
    void recordOnboardingEvent(0, 'view');
  }, []);

  useEffect(() => {
    if (step > 0) void recordOnboardingEvent(step, 'view');
  }, [step]);

  const loadFirstPick = useCallback(async (leagueIds: string[]) => {
    setPickLoading(true);
    setPickError(null);
    try {
      const beta = soccerBetaFetchParams();
      const leagues =
        leagueIds.length > 0 ? leagueIds.join(',') : beta.leagues;
      const res = await apiService.getForYouFeed({
        ...beta,
        leagues,
        limit: 8,
      });
      const picks = (res.picks || [])
        .map(toBestPick)
        .filter((p) => !p.guest_locked && p.prediction);
      setFirstPick(picks[0] ?? null);
      if (!picks[0]) {
        setPickError('No upcoming picks yet for your leagues. You can browse Home instead.');
      }
    } catch (e) {
      setFirstPick(null);
      setPickError(getUserFriendlyMessage(e));
    } finally {
      setPickLoading(false);
    }
  }, []);

  const goHome = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }),
    );
  }, [navigation]);

  const finishOnboarding = useCallback(
    async (opts?: { openGameId?: string }) => {
      void recordOnboardingEvent(step, 'complete');
      void trackOnboardingCompleted(pushOptIn);
      await setOnboardingComplete().catch(() => {});
      await setScorecardNudgePending(true).catch(() => {});
      if (opts?.openGameId) {
        await setPendingFirstPrediction(opts.openGameId).catch(() => {});
        void trackFirstPredictionOpened(opts.openGameId, 'auth', 'onboarding');
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'GameDetail', params: { gameId: opts.openGameId } },
            ],
          }),
        );
        return;
      }
      goHome();
    },
    [navigation, step, pushOptIn, goHome],
  );

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

  const saveLeaguesAndAdvance = async () => {
    if (saving) return;
    if (selected.size === 0) {
      Alert.alert(
        'Pick a league',
        'Choose at least one competition so we can show a real first pick. Or skip to browse Home.',
      );
      return;
    }
    setSaving(true);
    const leagues = [...selected];
    try {
      await Promise.all(
        leagues.map((leagueId) =>
          apiService.addFavoriteLeague(leagueId).catch(() => undefined),
        ),
      );
      await applyPushPreference();
      void trackFavouriteSelected(leagues.length, 'onboarding');
      setLeaguesSaved(true);
      setStep(3);
      void loadFirstPick(leagues);
    } catch (error) {
      Alert.alert('Could not save preferences', getUserFriendlyMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (saving) return;
    void recordOnboardingEvent(step, 'skip');
    setSaving(true);
    void (async () => {
      try {
        if (step === 2 && !leaguesSaved) {
          await applyPushPreference().catch(() => {});
        }
        await finishOnboarding();
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleNext = () => {
    if (saving) return;
    void recordOnboardingEvent(step, 'next');
    if (step === 2) {
      void saveLeaguesAndAdvance();
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  };

  const openFirstPick = () => {
    if (!firstPick || saving) return;
    setSaving(true);
    void finishOnboarding({ openGameId: firstPick.id }).finally(() => setSaving(false));
  };

  const primaryLabel =
    step === 0 || step === 1
      ? 'Continue'
      : step === 2
        ? selected.size > 0
          ? `Continue · ${selected.size} league${selected.size === 1 ? '' : 's'}`
          : 'Pick a league to continue'
        : firstPick
          ? 'Open this pick'
          : 'Browse Home';

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
      testID="onboarding-screen"
    >
      <View style={styles.header}>
        <StepDots step={step} />
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={handleSkip}
          style={({ pressed }) => [styles.skipTop, pressed && !saving && styles.skipPressed]}
          testID="onboarding-skip"
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
            <ValueBullet icon="stats-chart-outline" text="Scorecard shows hit rate, calibration, and sample size" />
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
                    testID={`onboarding-league-${league.id}`}
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

        {step === 3 && (
          <View style={styles.slide} testID="onboarding-first-pick">
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={36} color={theme.colors.accent} />
            </View>
            <Text style={styles.title}>{ONBOARDING_FIRST_PICK_TITLE}</Text>
            <Text style={styles.subtitle}>{ONBOARDING_FIRST_PICK_BODY}</Text>
            {pickLoading ? (
              <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 24 }} />
            ) : firstPick ? (
              <View style={styles.pickWrap}>
                <Text style={styles.pickLeague}>{formatLeagueLabel(firstPick.league)}</Text>
                <BestPickMiniCard pick={firstPick} onPress={openFirstPick} />
              </View>
            ) : (
              <Text style={styles.pickEmpty}>{pickError ?? 'No picks available right now.'}</Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={saving || (step === 2 && selected.size === 0)}
          onPress={
            step === 3
              ? firstPick
                ? openFirstPick
                : () => {
                    setSaving(true);
                    void finishOnboarding().finally(() => setSaving(false));
                  }
              : handleNext
          }
          style={({ pressed }) => [
            styles.primaryButton,
            (saving || (step === 2 && selected.size === 0)) && styles.buttonDisabled,
            pressed && !saving && styles.primaryPressed,
          ]}
          testID="onboarding-primary"
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
  pickWrap: {
    alignItems: 'flex-start',
  },
  pickLeague: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  pickEmpty: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
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

/**
 * Persist onboarding completion so we only show the 3-step flow once after signup/login.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@sport_prediction_onboarding_done';
const ONBOARDING_EVENTS_KEY = '@sport_prediction_onboarding_events';

type OnboardingEvent = { step: number; action: string; at: string };

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

/** Lightweight local funnel log for completion-rate review (no network). */
export async function recordOnboardingEvent(
  step: number,
  action: 'view' | 'next' | 'skip' | 'complete',
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_EVENTS_KEY);
    const events: OnboardingEvent[] = raw ? JSON.parse(raw) : [];
    events.push({ step, action, at: new Date().toISOString() });
    await AsyncStorage.setItem(ONBOARDING_EVENTS_KEY, JSON.stringify(events.slice(-50)));
  } catch {
    /* non-blocking */
  }
}

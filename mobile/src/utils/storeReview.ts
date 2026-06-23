/**
 * Native App Store / Play review prompt after positive sessions (L-09).
 */
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';
import { getReviewPromptState, saveReviewPromptState } from './reviewPromptStorage';

const MIN_LAUNCHES = 3;
const MIN_POSITIVE_SESSIONS = 1;
const COOLDOWN_DAYS = 90;

/** Call once per cold start when the app shell is ready. */
export async function recordAppLaunch(): Promise<void> {
  const state = await getReviewPromptState();
  await saveReviewPromptState({ ...state, launchCount: state.launchCount + 1 });
}

/**
 * Mark a positive engagement moment (e.g. viewed accuracy with enough sample).
 * Does not show the prompt immediately — pair with maybeRequestStoreReview().
 */
export async function recordPositiveSession(): Promise<void> {
  const state = await getReviewPromptState();
  await saveReviewPromptState({
    ...state,
    positiveSessionCount: state.positiveSessionCount + 1,
  });
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/** Request in-app store review when eligibility gates pass. OS may still decline to show UI. */
export async function maybeRequestStoreReview(): Promise<void> {
  if (Platform.OS === 'web') return;

  const state = await getReviewPromptState();
  if (state.launchCount < MIN_LAUNCHES) return;
  if (state.positiveSessionCount < MIN_POSITIVE_SESSIONS) return;
  if (state.lastPromptIso && daysSince(state.lastPromptIso) < COOLDOWN_DAYS) return;

  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    const hasAction = await StoreReview.hasAction();
    if (!hasAction) return;
    await StoreReview.requestReview();
    await saveReviewPromptState({ ...state, lastPromptIso: new Date().toISOString() });
  } catch {
    // Simulator / policy limits — ignore
  }
}

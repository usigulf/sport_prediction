/**
 * Free activation funnel (audit #14): favourite → first pick → scorecard.
 * Complements one-time onboarding; persists soft nudges across MainTabs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_GAME_KEY = '@octobetiq_activation_pending_game';
const SCORECARD_NUDGE_KEY = '@octobetiq_activation_scorecard_nudge';
const ACTIVATION_DONE_KEY = '@octobetiq_activation_complete';

export async function setPendingFirstPrediction(gameId: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_GAME_KEY, gameId);
}

export async function consumePendingFirstPrediction(): Promise<string | null> {
  try {
    const id = await AsyncStorage.getItem(PENDING_GAME_KEY);
    if (id) await AsyncStorage.removeItem(PENDING_GAME_KEY);
    return id;
  } catch {
    return null;
  }
}

export async function setScorecardNudgePending(pending: boolean): Promise<void> {
  if (pending) await AsyncStorage.setItem(SCORECARD_NUDGE_KEY, 'true');
  else await AsyncStorage.removeItem(SCORECARD_NUDGE_KEY);
}

export async function getScorecardNudgePending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SCORECARD_NUDGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markActivationComplete(): Promise<void> {
  await AsyncStorage.multiSet([
    [ACTIVATION_DONE_KEY, 'true'],
    [SCORECARD_NUDGE_KEY, ''],
  ]);
  await AsyncStorage.removeItem(SCORECARD_NUDGE_KEY);
}

export async function getActivationComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ACTIVATION_DONE_KEY)) === 'true';
  } catch {
    return false;
  }
}

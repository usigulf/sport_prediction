/**
 * Persist launch / positive-session counts for store review prompt (L-09).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@octobetiq_review_prompt_v1';

export type ReviewPromptState = {
  launchCount: number;
  positiveSessionCount: number;
  lastPromptIso: string | null;
};

const DEFAULT_STATE: ReviewPromptState = {
  launchCount: 0,
  positiveSessionCount: 0,
  lastPromptIso: null,
};

export async function getReviewPromptState(): Promise<ReviewPromptState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<ReviewPromptState>;
    return {
      launchCount: typeof parsed.launchCount === 'number' ? parsed.launchCount : 0,
      positiveSessionCount:
        typeof parsed.positiveSessionCount === 'number' ? parsed.positiveSessionCount : 0,
      lastPromptIso: typeof parsed.lastPromptIso === 'string' ? parsed.lastPromptIso : null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveReviewPromptState(state: ReviewPromptState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

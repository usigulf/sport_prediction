/**
 * Persist onboarding completion so we only show league picker once after signup/login.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@sport_prediction_onboarding_done';

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

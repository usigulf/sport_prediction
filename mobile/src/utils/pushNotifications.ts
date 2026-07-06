/**
 * Register device for push notifications (Expo Push).
 * Only request OS permission after explicit user opt-in (onboarding toggle or Settings).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiService } from '../services/api';
import { getOnboardingComplete } from './onboardingStorage';
import { getPushNotificationsEnabled } from './settingsStorage';

export type RegisterPushOptions = {
  /** When true, may show the OS permission dialog. Use only after user opt-in. */
  requestPermission?: boolean;
};

export async function registerPushTokenIfPossible(
  options: RegisterPushOptions = {},
): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const enabled = await getPushNotificationsEnabled();
    if (!enabled) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (existingStatus !== 'granted') {
      if (!options.requestPermission) return;
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      status = newStatus;
    }
    if (status !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;
    if (token) await apiService.registerPushToken(token);
  } catch {
    // ignore (e.g. no network, simulator, or user denied)
  }
}

/**
 * Re-sync push token on app launch for users who already opted in.
 * Does not prompt for permission — onboarding/settings handle first consent.
 */
export async function syncPushRegistrationAfterConsent(): Promise<void> {
  const onboardingDone = await getOnboardingComplete();
  if (!onboardingDone) return;
  const enabled = await getPushNotificationsEnabled();
  if (!enabled) return;
  await registerPushTokenIfPossible({ requestPermission: false });
}

/** Remove push token from backend (e.g. when user disables notifications in Settings). */
export async function disablePushNotifications(): Promise<void> {
  try {
    await apiService.removePushToken();
  } catch {
    // ignore
  }
}

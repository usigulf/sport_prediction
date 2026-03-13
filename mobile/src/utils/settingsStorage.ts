/**
 * Simple app settings (e.g. push notifications on/off).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_ENABLED_KEY = '@sport_prediction_push_enabled';

export async function getPushNotificationsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export async function setPushNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PUSH_ENABLED_KEY, enabled ? 'true' : 'false');
}

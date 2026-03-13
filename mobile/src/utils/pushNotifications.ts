/**
 * Register device for push notifications (Expo Push).
 * Call when user is logged in so the backend can send "high-confidence pick" / "game starting" etc.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiService } from '../services/api';
import { getPushNotificationsEnabled } from './settingsStorage';

export async function registerPushTokenIfPossible(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const enabled = await getPushNotificationsEnabled();
    if (!enabled) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (existingStatus !== 'granted') {
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

/** Remove push token from backend (e.g. when user disables notifications in Settings). */
export async function disablePushNotifications(): Promise<void> {
  try {
    await apiService.removePushToken();
  } catch {
    // ignore
  }
}

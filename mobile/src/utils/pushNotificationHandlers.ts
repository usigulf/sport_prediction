/**
 * Expo push: foreground display + tap → open game detail.
 * Backend payload: { type: "game_reminder"|"high_confidence"|"post_game_result", game_id: "<uuid>" }
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import { registerPushNotificationCategories } from './pushNotificationCategories';

function gameIdFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const raw = d.game_id ?? d.gameId;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return null;
}

export function navigateFromPushData(data: unknown): boolean {
  const gameId = gameIdFromData(data);
  if (!gameId || !navigationRef.isReady()) return false;
  navigationRef.navigate('GameDetail', { gameId });
  return true;
}

/** Call once at app startup (before listeners). */
export function configurePushNotificationPresentation(): void {
  if (Platform.OS === 'web') return;
  void registerPushNotificationCategories();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Wire tap + cold-start from notification. Returns cleanup.
 * Call when navigation is mounted (e.g. after appReady).
 */
export function subscribeToPushNotificationResponses(): () => void {
  if (Platform.OS === 'web') return () => {};

  const tryNavigate = (data: unknown, delayMs = 0) => {
    const run = () => {
      if (navigateFromPushData(data)) return;
      if (delayMs < 1200) {
        setTimeout(() => navigateFromPushData(data), 400);
      }
    };
    if (delayMs > 0) setTimeout(run, delayMs);
    else run();
  };

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    tryNavigate(response.notification.request.content.data, 600);
  });

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    tryNavigate(response.notification.request.content.data);
  });

  return () => sub.remove();
}

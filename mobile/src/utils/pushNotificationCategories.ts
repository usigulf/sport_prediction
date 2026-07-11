/**
 * iOS notification categories for kickoff, high-confidence picks, and post-game results.
 * Backend sets matching `categoryId` on Expo push payloads (see push_service.py).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const PUSH_CATEGORY_KICKOFF = 'kickoff';
export const PUSH_CATEGORY_UPSET_PICKS = 'upset_picks';
export const PUSH_CATEGORY_RESULTS = 'results';
export const PUSH_CATEGORY_ACCOUNT = 'account';

export async function registerPushNotificationCategories(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  await Promise.all([
    Notifications.setNotificationCategoryAsync(PUSH_CATEGORY_KICKOFF, [], {
      previewPlaceholder: 'Kickoff reminder',
    }),
    Notifications.setNotificationCategoryAsync(PUSH_CATEGORY_UPSET_PICKS, [], {
      previewPlaceholder: 'High-confidence pick',
    }),
    Notifications.setNotificationCategoryAsync(PUSH_CATEGORY_RESULTS, [], {
      previewPlaceholder: 'Game result',
    }),
    Notifications.setNotificationCategoryAsync(PUSH_CATEGORY_ACCOUNT, [], {
      previewPlaceholder: 'Account update',
    }),
  ]);
}

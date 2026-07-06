import { Linking, Platform } from 'react-native';

/** Opens iOS Settings → Apple ID → Subscriptions (App Store requirement). */
export const IOS_MANAGE_SUBSCRIPTIONS_URL =
  'https://apps.apple.com/account/subscriptions';

export function isIosManageSubscriptionsAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function openIosManageSubscriptions(): Promise<boolean> {
  if (!isIosManageSubscriptionsAvailable()) return false;
  try {
    const supported = await Linking.canOpenURL(IOS_MANAGE_SUBSCRIPTIONS_URL);
    if (!supported) return false;
    await Linking.openURL(IOS_MANAGE_SUBSCRIPTIONS_URL);
    return true;
  } catch {
    return false;
  }
}

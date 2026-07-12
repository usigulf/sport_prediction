import { ADS_NATIVE_MODULE_AVAILABLE } from '../constants';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isGoogleTestAdUnit, isProductionAdsEnabled } from '../config/adMobEnv';

type GmaModule = typeof import('react-native-google-mobile-ads');

let cached: GmaModule | null | undefined;

/** Safe for Expo Go: returns null without evaluating `require()` when unsupported. */
export function loadGoogleMobileAdsModule(): GmaModule | null {
  if (!ADS_NATIVE_MODULE_AVAILABLE) return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-google-mobile-ads') as GmaModule;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * iOS App Tracking Transparency: must be requested before initializing the ad
 * SDK so AdMob can decide whether it may use IDFA. No-op on Android / Expo Go.
 * Failures are swallowed — ads still serve in non-personalized mode if denied.
 */
async function requestTrackingPermissionIfNeeded(): Promise<void> {
  try {
    const { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('expo-tracking-transparency') as typeof import('expo-tracking-transparency');
    const current = await getTrackingPermissionsAsync();
    if (current.status === 'undetermined' && current.canAskAgain) {
      await requestTrackingPermissionsAsync();
    }
  } catch {
    // module unavailable (e.g. web) — skip
  }
}

export async function initializeGoogleMobileAds(): Promise<void> {
  const { canInitializeAdsSdk } = await import('../../utils/privacyPreferences');
  if (!(await canInitializeAdsSdk())) return;
  const m = loadGoogleMobileAdsModule();
  if (!m) return;
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const appId =
    Platform.OS === 'ios'
      ? (extra.adMobAppIdIos as string | undefined)
      : (extra.adMobAppIdAndroid as string | undefined);
  // Never init the ad SDK in release with Google's sample publisher id (Info.plist may still list it).
  if (!__DEV__ && (!appId || isGoogleTestAdUnit(appId))) {
    console.warn('[AdMob] SDK init skipped: missing or test App ID in release build', {
      appId: appId ? `${appId.slice(0, 20)}…` : null,
    });
    return;
  }
  if (isProductionAdsEnabled() && (!appId || isGoogleTestAdUnit(appId))) {
    console.warn('[AdMob] SDK init skipped: production ads enabled but App ID invalid');
    return;
  }
  try {
    await requestTrackingPermissionIfNeeded();
    const mobileAds = m.default();
    await mobileAds.initialize();
    console.warn('[AdMob] SDK initialized', {
      production: isProductionAdsEnabled(),
      platform: Platform.OS,
    });
    if (__DEV__) {
      await mobileAds.setRequestConfiguration({
        testDeviceIdentifiers: ['EMULATOR'],
      });
    }
  } catch (e) {
    console.warn('[AdMob] SDK init failed', e);
  }
}

export type { GmaModule };

import { ADS_NATIVE_MODULE_AVAILABLE } from '../constants';

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
  const m = loadGoogleMobileAdsModule();
  if (!m) return;
  try {
    await requestTrackingPermissionIfNeeded();
    const mobileAds = m.default();
    await mobileAds.initialize();
    if (__DEV__) {
      await mobileAds.setRequestConfiguration({
        testDeviceIdentifiers: ['EMULATOR'],
      });
    }
  } catch {
    // ignore — ads stay disabled / fall back to house promos
  }
}

export type { GmaModule };

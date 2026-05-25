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

export async function initializeGoogleMobileAds(): Promise<void> {
  const m = loadGoogleMobileAdsModule();
  if (!m) return;
  try {
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

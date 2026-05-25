import { NativeModules, Platform } from 'react-native';

/** Ads use native SDKs — not wired for web. */
export const AD_PLATFORM_SUPPORTED =
  Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Prefer a real native check: Expo Go has no `RNGoogleMobileAdsModule`; dev / release builds do.
 * (`executionEnvironment` alone can be wrong for some dev-client setups.)
 */
export const ADS_NATIVE_MODULE_AVAILABLE =
  AD_PLATFORM_SUPPORTED &&
  (NativeModules as { RNGoogleMobileAdsModule?: unknown }).RNGoogleMobileAdsModule != null;

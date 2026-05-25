import { Platform } from 'react-native';

/** Google's official sample IDs (no dependency on RNGMA package for Expo Go fallback). */
const ANDROID = {
  ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/9214589741',
  NATIVE: 'ca-app-pub-3940256099942544/2247696110',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
} as const;

const IOS = {
  ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/2435281174',
  NATIVE: 'ca-app-pub-3940256099942544/3986624511',
  REWARDED: 'ca-app-pub-3940256099942544/1712485313',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',
} as const;

export function testBannerAdaptiveUnit(): string {
  return Platform.OS === 'android'
    ? ANDROID.ADAPTIVE_BANNER
    : IOS.ADAPTIVE_BANNER;
}

export function testNativeUnit(): string {
  return Platform.OS === 'android' ? ANDROID.NATIVE : IOS.NATIVE;
}

export function testRewardedUnit(): string {
  return Platform.OS === 'android' ? ANDROID.REWARDED : IOS.REWARDED;
}

export function testInterstitialUnit(): string {
  return Platform.OS === 'android' ? ANDROID.INTERSTITIAL : IOS.INTERSTITIAL;
}

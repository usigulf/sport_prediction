import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  testBannerAdaptiveUnit,
  testNativeUnit,
  testRewardedUnit,
  testInterstitialUnit,
} from './adMobTestUnits';

const extra = (): Record<string, unknown> =>
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined) ?? {};

function pick(
  keyIos: string,
  keyAndroid: string,
  testId: string,
): string {
  if (__DEV__) return testId;
  const ios = extra()[keyIos];
  const android = extra()[keyAndroid];
  if (Platform.OS === 'android' && typeof android === 'string' && android.length > 10)
    return android;
  if (Platform.OS === 'ios' && typeof ios === 'string' && ios.length > 10) return ios;
  return testId;
}

export const AD_UNITS = {
  bannerAdaptive: () =>
    pick('adMobBannerIos', 'adMobBannerAndroid', testBannerAdaptiveUnit()),
  native: () => pick('adMobNativeIos', 'adMobNativeAndroid', testNativeUnit()),
  rewarded: () =>
    pick('adMobRewardedIos', 'adMobRewardedAndroid', testRewardedUnit()),
  interstitial: () =>
    pick(
      'adMobInterstitialIos',
      'adMobInterstitialAndroid',
      testInterstitialUnit(),
    ),
} as const;

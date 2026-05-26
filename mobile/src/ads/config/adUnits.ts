import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  testBannerAdaptiveUnit,
  testNativeUnit,
  testRewardedUnit,
  testInterstitialUnit,
} from './adMobTestUnits';
import { isGoogleTestAdUnit, isProductionAdsEnabled } from './adMobEnv';

const extra = (): Record<string, unknown> =>
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined) ?? {};

function pick(
  keyIos: string,
  keyAndroid: string,
  testId: string,
): string {
  const ios = extra()[keyIos];
  const android = extra()[keyAndroid];
  const configured =
    Platform.OS === 'android' && typeof android === 'string' && android.length > 10
      ? android
      : Platform.OS === 'ios' && typeof ios === 'string' && ios.length > 10
        ? ios
        : null;

  if (__DEV__ || !isProductionAdsEnabled()) {
    return testId;
  }

  if (configured && !isGoogleTestAdUnit(configured)) {
    return configured;
  }

  if (configured && isGoogleTestAdUnit(configured)) {
    console.warn(
      `[AdMob] Production build but ${keyIos}/${keyAndroid} is still a Google test unit. Set EAS secrets.`,
    );
  }
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

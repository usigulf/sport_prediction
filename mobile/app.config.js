/** @type {import('@expo/config').ExpoConfig} */
const appJson = require('./app.json');

const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_APP_IOS = 'ca-app-pub-3940256099942544~1458002511';
/** octobetiQ iOS — AdMob console app id (public; safe in repo). */
const OCTOBETIQ_ADMOB_APP_IOS = 'ca-app-pub-1914108971892809~4005514565';
const TEST_APP_ANDROID = 'ca-app-pub-3940256099942544~3347511713';

const SOCCER_BETA_DESCRIPTION =
  'Informational AI soccer picks across major international competitions. Tracked model accuracy. Not betting advice.';

// RevenueCat public SDK key — set EXPO_PUBLIC_REVENUECAT_IOS_KEY in EAS production env.
const REVENUECAT_DEFAULT_KEY = '';

module.exports = ({ config }) => {
  const base = appJson.expo ?? config;
  const useProductionAds = process.env.EXPO_PUBLIC_ADMOB_PRODUCTION === 'true';
  const betaSoccerOnly = process.env.EXPO_PUBLIC_BETA_SOCCER_ONLY === 'true';

  const pickUnit = (envVal, extraVal, testVal) => {
    if (envVal && String(envVal).length > 10) return envVal;
    if (extraVal && String(extraVal).length > 10) return extraVal;
    return testVal;
  };

  const adMobAppIdIos = pickUnit(
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS,
    base.extra?.adMobAppIdIos,
    OCTOBETIQ_ADMOB_APP_IOS,
  );
  const adMobAppIdAndroid = pickUnit(
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID,
    base.extra?.adMobAppIdAndroid,
    TEST_APP_ANDROID,
  );

  const adMobBannerIos = pickUnit(
    process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
    base.extra?.adMobBannerIos,
    TEST_BANNER_IOS,
  );
  const adMobBannerAndroid = pickUnit(
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    base.extra?.adMobBannerAndroid,
    TEST_BANNER_ANDROID,
  );

  const description = betaSoccerOnly
    ? SOCCER_BETA_DESCRIPTION
    : base.description;

  const plugins = (base.plugins ?? []).map((plugin) => {
      if (
        Array.isArray(plugin) &&
        plugin[0] === 'react-native-google-mobile-ads'
      ) {
        return [
          plugin[0],
          {
            ...(plugin[1] ?? {}),
            iosAppId: adMobAppIdIos,
            androidAppId: adMobAppIdAndroid,
            delayAppMeasurementInit: true,
          },
        ];
      }
    return plugin;
  });
  if (
    !plugins.some(
      (p) => p === 'expo-web-browser' || (Array.isArray(p) && p[0] === 'expo-web-browser'),
    )
  ) {
    plugins.push('expo-web-browser');
  }

  return {
    ...base,
    description,
    plugins,
    extra: {
      ...base.extra,
      betaSoccerOnly,
      adMobProduction: useProductionAds,
      adMobAppIdIos,
      adMobAppIdAndroid,
      adMobBannerIos,
      adMobBannerAndroid,
      adMobNativeIos: pickUnit(
        process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS,
        base.extra?.adMobNativeIos,
        'ca-app-pub-3940256099942544/3986624511',
      ),
      adMobNativeAndroid: pickUnit(
        process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID,
        base.extra?.adMobNativeAndroid,
        'ca-app-pub-3940256099942544/2247696110',
      ),
      adMobRewardedIos: pickUnit(
        process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
        base.extra?.adMobRewardedIos,
        'ca-app-pub-3940256099942544/1712485313',
      ),
      adMobRewardedAndroid: pickUnit(
        process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
        base.extra?.adMobRewardedAndroid,
        'ca-app-pub-3940256099942544/5224354917',
      ),
      adMobInterstitialIos: pickUnit(
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
        base.extra?.adMobInterstitialIos,
        'ca-app-pub-3940256099942544/4411468910',
      ),
      adMobInterstitialAndroid: pickUnit(
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
        base.extra?.adMobInterstitialAndroid,
        'ca-app-pub-3940256099942544/1033173712',
      ),
      revenueCatIosKey:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
        base.extra?.revenueCatIosKey ||
        REVENUECAT_DEFAULT_KEY,
      revenueCatAndroidKey:
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
        base.extra?.revenueCatAndroidKey ||
        REVENUECAT_DEFAULT_KEY,
      revenueCatEntitlementPremium:
        base.extra?.revenueCatEntitlementPremium || 'premium',
      revenueCatEntitlementPro: base.extra?.revenueCatEntitlementPro || 'pro',
    },
  };
};

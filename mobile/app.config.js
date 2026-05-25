/** @type {import('@expo/config').ExpoConfig} */
const appJson = require('./app.json');

const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';

const SOCCER_BETA_DESCRIPTION =
  'Informational AI soccer picks: Premier League, Champions League, La Liga, Serie A, Bundesliga, MLS. Tracked model accuracy. Not betting advice.';

module.exports = ({ config }) => {
  const base = appJson.expo ?? config;
  const useProductionAds = process.env.EXPO_PUBLIC_ADMOB_PRODUCTION === 'true';
  const betaSoccerOnly = process.env.EXPO_PUBLIC_BETA_SOCCER_ONLY === 'true';

  const adMobBannerIos =
    process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ||
    (useProductionAds ? base.extra?.adMobBannerIos : TEST_BANNER_IOS);
  const adMobBannerAndroid =
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ||
    (useProductionAds ? base.extra?.adMobBannerAndroid : TEST_BANNER_ANDROID);

  const description = betaSoccerOnly
    ? SOCCER_BETA_DESCRIPTION
    : base.description;

  return {
    ...base,
    description,
    extra: {
      ...base.extra,
      betaSoccerOnly,
      adMobBannerIos,
      adMobBannerAndroid,
      adMobNativeIos:
        process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS || base.extra?.adMobNativeIos,
      adMobNativeAndroid:
        process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID ||
        base.extra?.adMobNativeAndroid,
      adMobRewardedIos:
        process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS || base.extra?.adMobRewardedIos,
      adMobRewardedAndroid:
        process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID ||
        base.extra?.adMobRewardedAndroid,
      adMobInterstitialIos:
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS ||
        base.extra?.adMobInterstitialIos,
      adMobInterstitialAndroid:
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID ||
        base.extra?.adMobInterstitialAndroid,
    },
  };
};

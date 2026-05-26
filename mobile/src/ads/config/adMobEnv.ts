import Constants from 'expo-constants';

/** Google sample publisher prefix — must not ship in store builds when production ads are enabled. */
export const GOOGLE_ADMOB_TEST_PUBLISHER = 'ca-app-pub-3940256099942544';

export function isGoogleTestAdUnit(unitId: string | undefined): boolean {
  return !!unitId && unitId.includes(GOOGLE_ADMOB_TEST_PUBLISHER);
}

/** True when EAS/profile sets EXPO_PUBLIC_ADMOB_PRODUCTION=true (store builds). */
export function isProductionAdsEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_ADMOB_PRODUCTION === 'true') return true;
  const extra = Constants.expoConfig?.extra as { adMobProduction?: boolean } | undefined;
  return extra?.adMobProduction === true;
}

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { useAdEngine } from '../engine/AdEngineContext';
import { useAdsEnabled } from '../hooks/useAdsEnabled';
import { AD_UNITS } from '../config/adUnits';
import { ADS_NATIVE_MODULE_AVAILABLE } from '../constants';
import { loadGoogleMobileAdsModule } from '../native/loadGma';

export function useGameExitInterstitial(
  navigation: NavigationProp<Record<string, object | undefined>>,
) {
  const adsEnabled = useAdsEnabled();
  const engine = useAdEngine();
  const loaded = useRef(false);
  const interstitialRef = useRef<import('react-native-google-mobile-ads').InterstitialAd | null>(
    null,
  );

  useEffect(() => {
    if (!adsEnabled) return;
    if (
      !ADS_NATIVE_MODULE_AVAILABLE ||
      Platform.OS === 'web'
    ) {
      return;
    }
    const gma = loadGoogleMobileAdsModule();
    if (!gma) return;

    const { InterstitialAd, AdEventType } = gma;
    const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial());
    interstitialRef.current = ad;

    const sub = ad.addAdEventListener(AdEventType.LOADED, () => {
      loaded.current = true;
    });
    ad.load();
    return () => {
      sub();
    };
  }, [adsEnabled]);

  useEffect(() => {
    if (!adsEnabled) return;
    const unsub = navigation.addListener('beforeRemove', () => {
      if (!ADS_NATIVE_MODULE_AVAILABLE) return;
      const ad = interstitialRef.current;
      if (!ad || !loaded.current) return;
      if (!engine.shouldAttemptInterstitial()) return;
      try {
        ad.show();
        engine.markInterstitialConsumed();
        void engine.trackEvent('GameDetail', 'impression', 'interstitial');
        loaded.current = false;
        ad.load();
      } catch {
        // no-op
      }
    });
    return unsub;
  }, [adsEnabled, engine, navigation]);
}

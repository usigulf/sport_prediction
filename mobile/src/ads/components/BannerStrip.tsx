import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { useAdEngine } from '../engine/AdEngineContext';
import { useAdsEnabled } from '../hooks/useAdsEnabled';
import { AD_UNITS } from '../config/adUnits';
import { AD_PLATFORM_SUPPORTED, ADS_NATIVE_MODULE_AVAILABLE } from '../constants';
import { loadGoogleMobileAdsModule } from '../native/loadGma';
import { HousePromotionCard } from './HousePromotionCard';
import { theme } from '../../constants/theme';

type Props = {
  screen: string;
};

/**
 * Adaptive banner — bottom of match detail / live hub contexts.
 * Renders nothing in Expo Go (no native module).
 */
export const BannerStrip: React.FC<Props> = ({ screen }) => {
  const adsEnabled = useAdsEnabled();
  const engine = useAdEngine();
  const [failed, setFailed] = useState(false);
  const unitId = AD_UNITS.bannerAdaptive();
  const [BannerAdCmp, setBannerAdCmp] = useState<React.ComponentType<any> | null>(
    null,
  );
  const [bannerSize, setBannerSize] = useState<string | null>(null);

  useEffect(() => {
    if (!ADS_NATIVE_MODULE_AVAILABLE) return;
    const m = loadGoogleMobileAdsModule();
    if (!m) return;
    setBannerAdCmp(() => m.BannerAd);
    setBannerSize(m.BannerAdSize.ANCHORED_ADAPTIVE_BANNER);
  }, []);

  if (!adsEnabled) {
    return null;
  }

  if (!AD_PLATFORM_SUPPORTED || Platform.OS === 'web' || !ADS_NATIVE_MODULE_AVAILABLE) {
    return (
      <HousePromotionCard
        surface={screen}
        title="Try octobetiQ Premium"
        subtitle="Ads unavailable in this build — upgrade for an ad-free experience."
      />
    );
  }

  if (failed) {
    return (
      <HousePromotionCard
        surface={screen}
        title="Try octobetiQ Premium"
        subtitle="No ad fill yet — new AdMob units can take up to 48 hours. Premium is ad-free."
      />
    );
  }

  if (!BannerAdCmp || !bannerSize) {
    return (
      <View style={styles.placeholder} accessibilityElementsHidden>
        <Text style={styles.phText} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper} accessibilityLabel="banner advertisement">
      <BannerAdCmp
        unitId={unitId}
        size={bannerSize}
        onAdLoaded={() => {
          void engine.trackEvent(screen, 'impression', 'banner');
        }}
        onAdFailedToLoad={(err: unknown) => {
          console.warn('[AdMob] banner failed', screen, err);
          setFailed(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderSubtle,
    paddingVertical: 4,
  },
  placeholder: {
    height: 0,
    width: '100%',
  },
  phText: { fontSize: 1, opacity: 0 },
});

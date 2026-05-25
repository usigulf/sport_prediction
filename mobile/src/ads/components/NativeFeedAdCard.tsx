import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAdEngine } from '../engine/AdEngineContext';
import { useAdsEnabled } from '../hooks/useAdsEnabled';
import { AD_UNITS } from '../config/adUnits';
import { AD_PLATFORM_SUPPORTED, ADS_NATIVE_MODULE_AVAILABLE } from '../constants';
import { loadGoogleMobileAdsModule } from '../native/loadGma';
import { HousePromotionCard } from './HousePromotionCard';
import { theme } from '../../constants/theme';

type Props = {
  surface: 'home' | 'liveHub' | 'game_detail';
  /** Analytics label e.g. HomeFeed, LiveHub */
  screenLabel: string;
};

export const NativeFeedAdCard: React.FC<Props> = ({
  surface,
  screenLabel,
}) => {
  const adsEnabled = useAdsEnabled();
  const engine = useAdEngine();
  const [native, setNative] = useState<
    import('react-native-google-mobile-ads').NativeAd | null
  >(null);
  const [NativeAdViewCmp, setNativeAdViewCmp] = useState<
    React.ComponentType<any> | null
  >(null);
  const [NativeAssetCmp, setNativeAssetCmp] = useState<any>(null);
  const [NativeAssetTypeEnum, setNativeAssetTypeEnum] = useState<any>(null);
  const [fallback, setFallback] = useState(false);
  const allowed =
    surface === 'game_detail' || engine.canReserveNativeSurface(surface);

  useEffect(() => {
    if (
      !AD_PLATFORM_SUPPORTED ||
      Platform.OS === 'web' ||
      !ADS_NATIVE_MODULE_AVAILABLE
    ) {
      setFallback(true);
      return;
    }
    if (!allowed) {
      setFallback(true);
      return;
    }

    const gma = loadGoogleMobileAdsModule();
    if (!gma) {
      setFallback(true);
      return;
    }

    const { NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeAdEventType } =
      gma;

    setNativeAdViewCmp(() => NativeAdView);
    setNativeAssetCmp(() => NativeAsset);
    setNativeAssetTypeEnum(NativeAssetType);

    let disposed = false;
    let adObj: import('react-native-google-mobile-ads').NativeAd | null = null;

    (async () => {
      try {
        const a = await NativeAd.createForAdRequest(AD_UNITS.native());
        if (disposed) {
          a.destroy();
          return;
        }
        adObj = a;

        a.addAdEventListener(NativeAdEventType.IMPRESSION, () => {
          if (surface !== 'game_detail') engine.registerNativeImpression(surface);
          void engine.trackEvent(screenLabel, 'impression', 'native');
        });
        a.addAdEventListener(NativeAdEventType.CLICKED, () => {
          void engine.trackEvent(screenLabel, 'click', 'native');
        });

        setNative(a);
      } catch {
        if (!disposed) setFallback(true);
      }
    })();

    return () => {
      disposed = true;
      adObj?.destroy();
    };
  }, [allowed, adsEnabled, engine, screenLabel, surface]);

  if (!adsEnabled) {
    return null;
  }

  if (!allowed || fallback) {
    return (
      <HousePromotionCard
        surface={
          surface === 'game_detail'
            ? 'game_detail'
            : surface === 'home'
              ? 'home'
              : 'liveHub'
        }
        title="Go Premium for full AI edges"
        subtitle={
          !ADS_NATIVE_MODULE_AVAILABLE
            ? 'Install a dev build to load live ads in Expo. This is a non-intrusive placeholder.'
            : 'Non-intrusive fallback when no ad fill (mediation waterfall continues on device).'
        }
      />
    );
  }

  if (!native || !NativeAdViewCmp || !NativeAssetCmp || !NativeAssetTypeEnum) {
    return (
      <View style={styles.skeleton}>
        <Text style={styles.skelText}>Loading offer…</Text>
      </View>
    );
  }

  const NAT = NativeAssetTypeEnum;
  const Nav = NativeAdViewCmp;
  const Nas = NativeAssetCmp;

  return (
    <View style={styles.card} accessibilityLabel="native advertisement">
      <Text style={styles.sponsored}>Ad</Text>
      <Nav nativeAd={native} style={styles.nativeView}>
        <Nas assetType={NAT.HEADLINE}>
          <Text style={styles.headline} numberOfLines={2} />
        </Nas>
        <Nas assetType={NAT.BODY}>
          <Text style={styles.body} numberOfLines={3} />
        </Nas>
        <Nas assetType={NAT.CALL_TO_ACTION}>
          <View style={styles.ctaBtn}>
            <Text style={styles.ctaText}>Open</Text>
          </View>
        </Nas>
      </Nav>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  sponsored: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  nativeView: {
    minHeight: 120,
    gap: 6,
  },
  headline: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  body: { fontSize: 14, color: theme.colors.textSecondary },
  ctaBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.accentDim,
    marginTop: 6,
  },
  ctaText: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  skeleton: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundElevated,
  },
  skelText: { color: theme.colors.textMuted, fontSize: 13 },
});

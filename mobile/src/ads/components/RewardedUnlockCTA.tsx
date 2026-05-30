import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdEngine } from '../engine/AdEngineContext';
import { useRewardedUnlock } from '../engine/RewardedUnlockContext';
import { AD_UNITS } from '../config/adUnits';
import { AD_PLATFORM_SUPPORTED, ADS_NATIVE_MODULE_AVAILABLE } from '../constants';
import { loadGoogleMobileAdsModule } from '../native/loadGma';
import { theme } from '../../constants/theme';

type Props = {
  gameId: string;
  onUnlock?: () => void;
  onSubscribePress: () => void;
};

/**
 * Optional rewarded path — never required to view basic pick / navigate away.
 */
export const RewardedUnlockCTA: React.FC<Props> = ({
  gameId,
  onUnlock,
  onSubscribePress,
}) => {
  const engine = useAdEngine();
  const unlock = useRewardedUnlock();
  const [busy, setBusy] = useState(false);
  const handledRef = useRef(false);

  const onWatch = useCallback(() => {
    if (
      !AD_PLATFORM_SUPPORTED ||
      Platform.OS === 'web' ||
      !ADS_NATIVE_MODULE_AVAILABLE
    ) {
      onSubscribePress();
      return;
    }
    const gma = loadGoogleMobileAdsModule();
    if (!gma) {
      onSubscribePress();
      return;
    }

    setBusy(true);
    handledRef.current = false;
    const { RewardedAd, RewardedAdEventType } = gma;
    const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded());

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      ad.show().catch(() => {
        setBusy(false);
        ad.removeAllListeners();
      });
    });

    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      if (handledRef.current) return;
      handledRef.current = true;
      const mins = engine.nextRewardedUnlockMinutes();
      await unlock.grantUnlockForMinutes(gameId, mins);
      void engine.trackRewardComplete('GameDetail', 'admob');
      onUnlock?.();
      setBusy(false);
      ad.removeAllListeners();
    });

    const closeEvent =
      (RewardedAdEventType as unknown as { CLOSED?: string }).CLOSED ??
      (gma as { AdEventType?: { CLOSED?: string } }).AdEventType?.CLOSED;
    if (closeEvent) {
      ad.addAdEventListener(closeEvent as never, () => {
        if (!handledRef.current) setBusy(false);
        ad.removeAllListeners();
      });
    }

    ad.load();
  }, [engine, gameId, onSubscribePress, onUnlock, unlock]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Unlock full AI analysis</Text>
      <Text style={styles.sub}>
        Optional: watch a short video to reveal confidence details and richer context for about{' '}
        {engine.nextRewardedUnlockMinutes()} minutes. Basic pick info stays available without this.
        {!ADS_NATIVE_MODULE_AVAILABLE ? ' (Expo Go: use a dev build to test video ads.)' : ''}
      </Text>
      <TouchableOpacity
        style={styles.primary}
        onPress={onWatch}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Watch ad to unlock full AI analysis"
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <>
            <Ionicons name="play-circle" size={22} color={theme.colors.background} />
            <Text style={styles.primaryText}>
              {ADS_NATIVE_MODULE_AVAILABLE ? 'Watch ad to unlock' : 'Open subscription'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={onSubscribePress}>
        <Text style={styles.secondaryText}>Or subscribe for unlimited access</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    borderRadius: theme.radii.sm,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.background,
  },
  secondary: {
    marginTop: theme.spacing.sm,
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  incrementSessionCounter,
  bumpEngagement,
  startAdSession,
  applyTelemetryEvent,
  closeAdSessionPartial,
  enqueueServerFlush,
  summarizeEventForLogging,
} from '../analytics/sessionMetrics';
import { DEFAULT_AD_RULES, type AdRulesFile } from '../config/defaultAdRules';
import { AD_PLATFORM_SUPPORTED } from '../constants';
import type { AdFormat, AudienceSegment } from '../types';
import { useServerFeatureFlags } from '../../hooks/useServerFeatureFlags';
import { adDensitySpacing } from '../../utils/resolvedFeatureFlags';

const RULES_OVERRIDE_KEY = '@octobetiQ/ad_rules_override_v1';
const ENGAGEMENT_CACHE = '@octobetiQ/engagement_score_v1';

type AdEngineCtx = {
  initialized: boolean;
  sessionOrdinal: number;
  segment: AudienceSegment;
  rules: AdRulesFile;
  impressionCountNativeHome: number;
  impressionCountNativeLiveHub: number;
  canReserveNativeSurface: (surface: 'home' | 'liveHub') => boolean;
  registerNativeImpression: (surface: 'home' | 'liveHub') => void;
  spacingForLiveHub: () => number;
  spacingForHome: () => number;
  shouldAttemptInterstitial: () => boolean;
  markInterstitialConsumed: () => void;
  nextRewardedUnlockMinutes: () => number;
  preferPremiumAdNetworks: () => boolean;
  trackEvent: (
    screen: string,
    kind: 'impression' | 'click',
    format: AdFormat,
    network?: string,
  ) => Promise<void>;
  trackRewardComplete: (
    screen: string,
    network?: string,
    amountUsd?: number,
  ) => Promise<void>;
  persistSessionPing: () => Promise<void>;
  bumpPredictionEngagement: () => Promise<void>;
};

const AdEngineContext = createContext<AdEngineCtx | null>(null);

async function loadRulesOverride(): Promise<Partial<AdRulesFile> | null> {
  try {
    const raw = await AsyncStorage.getItem(RULES_OVERRIDE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AdRulesFile>;
  } catch {
    return null;
  }
}

async function engagementRead(): Promise<number> {
  const raw = await AsyncStorage.getItem(ENGAGEMENT_CACHE);
  return Math.max(0, parseInt(raw ?? '0', 10));
}

function shallowMergeRules(
  base: AdRulesFile,
  patch?: Partial<AdRulesFile> | null,
): AdRulesFile {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    segments: {
      ...base.segments,
      ...(patch.segments ?? {}),
    },
  };
}

function deriveSegment(
  sessionCount: number,
  engagementScore: number,
  file: AdRulesFile,
): AudienceSegment {
  if (sessionCount <= 3) return 'new';
  if (
    engagementScore >= file.highValueMinLifetimeEngagementScore ||
    sessionCount >= file.highValueMinSessions
  ) {
    return 'high_value';
  }
  return 'active';
}

function hashSpacing(min: number, max: number, salt: number): number {
  if (max <= min) return min;
  return min + Math.abs(((salt >> 3) ^ (salt * 13)) % (max - min + 1));
}

export const AdEngineProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [initialized, setInitialized] = useState(false);
  const [segment, setSegment] = useState<AudienceSegment>('new');
  const [sessionOrdinal, setSessionOrdinal] = useState(0);
  const [rulesState, setRulesState] = useState<AdRulesFile>(DEFAULT_AD_RULES);
  const [nativeHome, setNativeHome] = useState(0);
  const [nativeLive, setNativeLive] = useState(0);
  const serverFlags = useServerFeatureFlags();
  const densityFloor = adDensitySpacing(serverFlags);

  const lastInterstitialMs = useRef(0);
  const interstitialsThisSession = useRef(0);
  const sessionStartsAtMs = useRef(Date.now());

  useEffect(() => {
    let ended = false;
    sessionStartsAtMs.current = Date.now();
    (async () => {
      if (!AD_PLATFORM_SUPPORTED) {
        setInitialized(true);
        return;
      }
      const ord = await incrementSessionCounter();
      const engagement = await engagementRead();
      const ov = await loadRulesOverride();
      const merged = shallowMergeRules(DEFAULT_AD_RULES, ov);
      if (!ended) {
        setRulesState(merged);
        setSegment(deriveSegment(ord, engagement, merged));
        setSessionOrdinal(ord);
        await startAdSession();
        setInitialized(true);
      }
    })();
    return () => {
      ended = true;
    };
  }, []);

  const persistSessionPing = useCallback(async () => {
    const snap = await closeAdSessionPartial();
    if (snap)
      await enqueueServerFlush({
        ...snap,
        sessionDurationMs: Date.now() - sessionStartsAtMs.current,
      });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') void persistSessionPing();
    });
    return () => sub.remove();
  }, [persistSessionPing]);

  const segRules = rulesState.segments[segment];

  const bumpPredictionEngagement = useCallback(async () => {
    await bumpEngagement(3);
  }, []);

  const canReserveNativeSurface = useCallback(
    (surface: 'home' | 'liveHub'): boolean => {
      const caps =
        surface === 'home'
          ? segRules.maxNativeImpressionsHome
          : segRules.maxNativeImpressionsLiveHub;
      const cur = surface === 'home' ? nativeHome : nativeLive;
      return cur < caps;
    },
    [nativeHome, nativeLive, segRules],
  );

  const registerNativeImpression = useCallback((surface: 'home' | 'liveHub') => {
    if (surface === 'home') setNativeHome((n) => n + 1);
    else setNativeLive((n) => n + 1);
  }, []);

  const spacingForHome = useCallback(() => {
    const { homeMin, homeMax } = segRules.nativeFeedSpacing;
    return Math.max(hashSpacing(homeMin, homeMax, nativeHome + 977), densityFloor);
  }, [densityFloor, nativeHome, segRules.nativeFeedSpacing]);

  const spacingForLiveHub = useCallback(() => {
    const { liveHubMin, liveHubMax } = segRules.nativeFeedSpacing;
    return Math.max(hashSpacing(liveHubMin, liveHubMax, nativeLive + 431), densityFloor);
  }, [densityFloor, nativeLive, segRules.nativeFeedSpacing]);

  const shouldAttemptInterstitial = useCallback((): boolean => {
    const now = Date.now();
    if (segment === 'new') return false;
    if (interstitialsThisSession.current >= rulesState.maxInterstitialsPerSession)
      return false;
    const sr = segRules.interstitialBlacklistSessionRange;
    if (sr) {
      const [lo, hi] = sr;
      if (sessionOrdinal >= lo && sessionOrdinal <= hi) return false;
    }
    if (now - sessionStartsAtMs.current < segRules.suppressInterstitialFirstMs)
      return false;
    if (now - lastInterstitialMs.current < segRules.minMsBetweenInterstitials)
      return false;
    return true;
  }, [segment, segRules, sessionOrdinal, rulesState.maxInterstitialsPerSession]);

  const markInterstitialConsumed = useCallback(() => {
    lastInterstitialMs.current = Date.now();
    interstitialsThisSession.current += 1;
  }, []);

  const nextRewardedUnlockMinutes = useCallback(() => {
    const { min, max } = segRules.rewardedUnlockDurationMs;
    return Math.round((min + max) / 2 / 60_000);
  }, [segRules]);

  const preferPremiumAdNetworks = useCallback(
    () => segRules.premiumNetworkBias === true,
    [segRules],
  );

  const trackEvent = useCallback(
    async (screen: string, kind: 'impression' | 'click', format: AdFormat) => {
      const ev =
        kind === 'impression'
          ? ({
              kind: 'impression',
              screen,
              format,
              network: 'admob',
            } as const)
          : ({
              kind: 'click',
              screen,
              format,
              network: 'admob',
            } as const);
      await applyTelemetryEvent(ev);
      summarizeEventForLogging(ev);
    },
    [],
  );

  const trackRewardComplete = useCallback(
    async (screen: string, network = 'admob', amountUsd?: number) => {
      const ev = {
        kind: 'reward_complete' as const,
        screen,
        network,
        currency: amountUsd != null ? 'USD' : undefined,
        amount: amountUsd,
      };
      await applyTelemetryEvent(ev);
      summarizeEventForLogging(ev);
    },
    [],
  );

  const value = useMemo<AdEngineCtx>(
    () => ({
      initialized,
      sessionOrdinal,
      segment,
      rules: rulesState,
      impressionCountNativeHome: nativeHome,
      impressionCountNativeLiveHub: nativeLive,
      canReserveNativeSurface,
      registerNativeImpression,
      spacingForHome,
      spacingForLiveHub,
      shouldAttemptInterstitial,
      markInterstitialConsumed,
      nextRewardedUnlockMinutes,
      preferPremiumAdNetworks,
      trackEvent,
      trackRewardComplete,
      persistSessionPing,
      bumpPredictionEngagement,
    }),
    [
      initialized,
      sessionOrdinal,
      segment,
      rulesState,
      nativeHome,
      nativeLive,
      canReserveNativeSurface,
      registerNativeImpression,
      spacingForHome,
      spacingForLiveHub,
      shouldAttemptInterstitial,
      markInterstitialConsumed,
      nextRewardedUnlockMinutes,
      preferPremiumAdNetworks,
      trackEvent,
      trackRewardComplete,
      persistSessionPing,
      bumpPredictionEngagement,
    ],
  );

  return (
    <AdEngineContext.Provider value={value}>{children}</AdEngineContext.Provider>
  );
};

export function useAdEngine(): AdEngineCtx {
  const ctx = useContext(AdEngineContext);
  if (!ctx) throw new Error('useAdEngine must be inside AdEngineProvider');
  return ctx;
}

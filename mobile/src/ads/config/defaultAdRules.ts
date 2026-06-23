import type { AudienceSegment } from '../types';

/** Remote-configurable shape: merge overrides from AsyncStorage or your backend. */
export interface SegmentAdRules {
  /** No interstitials when session index is in this inclusive range [start, end] (1-based sessions). */
  interstitialBlacklistSessionRange: [number, number] | null;
  minMsBetweenInterstitials: number;
  /** Quiet period after cold start — no interstitials. */
  suppressInterstitialFirstMs: number;
  /** Native / feed: insert sponsor row every N primary content cells. */
  nativeFeedSpacing: { homeMin: number; homeMax: number; liveHubMin: number; liveHubMax: number };
  maxNativeImpressionsHome: number;
  maxNativeImpressionsLiveHub: number;
  rewardedUnlockDurationMs: { min: number; max: number };
  premiumNetworkBias: boolean;
}

export type AdRulesFile = {
  version: number;
  /** Hard cap on interstitial impressions per app session (cold start until process exit). */
  maxInterstitialsPerSession: number;
  /** Adjust thresholds for HIGH_VALUE classification. */
  highValueMinSessions: number;
  highValueMinLifetimeEngagementScore: number;
  segments: Record<AudienceSegment, SegmentAdRules>;
};

export const DEFAULT_AD_RULES: AdRulesFile = {
  version: 2,
  maxInterstitialsPerSession: 1,
  highValueMinSessions: 16,
  highValueMinLifetimeEngagementScore: 48,
  segments: {
    new: {
      interstitialBlacklistSessionRange: [1, 3],
      minMsBetweenInterstitials: 5 * 60 * 1000,
      suppressInterstitialFirstMs: 120_000,
      nativeFeedSpacing: { homeMin: 4, homeMax: 4, liveHubMin: 6, liveHubMax: 6 },
      maxNativeImpressionsHome: 2,
      maxNativeImpressionsLiveHub: 2,
      rewardedUnlockDurationMs: { min: 10 * 60 * 1000, max: 15 * 60 * 1000 },
      premiumNetworkBias: false,
    },
    active: {
      interstitialBlacklistSessionRange: null,
      minMsBetweenInterstitials: 4 * 60 * 1000,
      suppressInterstitialFirstMs: 90_000,
      nativeFeedSpacing: { homeMin: 3, homeMax: 4, liveHubMin: 5, liveHubMax: 6 },
      maxNativeImpressionsHome: 4,
      maxNativeImpressionsLiveHub: 4,
      rewardedUnlockDurationMs: { min: 10 * 60 * 1000, max: 20 * 60 * 1000 },
      premiumNetworkBias: false,
    },
    high_value: {
      interstitialBlacklistSessionRange: null,
      minMsBetweenInterstitials: 3 * 60 * 1000,
      suppressInterstitialFirstMs: 60_000,
      nativeFeedSpacing: { homeMin: 3, homeMax: 4, liveHubMin: 5, liveHubMax: 6 },
      maxNativeImpressionsHome: 5,
      maxNativeImpressionsLiveHub: 5,
      rewardedUnlockDurationMs: { min: 15 * 60 * 1000, max: 30 * 60 * 1000 },
      premiumNetworkBias: true,
    },
  },
};

export type AudienceSegment = 'new' | 'active' | 'high_value';

export type AdFormat = 'banner' | 'native' | 'interstitial' | 'rewarded';

export type AdTelemetryEvent =
  | { kind: 'impression'; screen: string; format: AdFormat; network: string }
  | { kind: 'click'; screen: string; format: AdFormat; network: string }
  | {
      kind: 'reward_complete';
      screen: string;
      network: string;
      currency?: string;
      amount?: number;
    };

export interface AdSessionSnapshot {
  sessionId: string;
  startedAt: number;
  ad_impression_count: number;
  ad_clicks: number;
  rewarded_ads_watched: number;
  revenue_per_session_micros: number;
  screen_where_ad_shown: Record<string, number>;
}

/**
 * Server-driven feature flags + experiment buckets (I77, I86–I90).
 */
import { useEffect, useState } from 'react';
import { getApiOrigin } from '../services/api';

export type ServerExperiments = {
  trial_length_days?: number;
  paywall_price_tier?: string;
  intro_offer_variant?: string;
  ad_density?: string;
  rewarded_ads_messaging?: string;
};

export type ServerFeatureFlags = {
  odds_display?: boolean;
  player_props?: boolean;
  referral_program?: boolean;
  email_digest?: boolean;
  parlay_correlation_warnings?: boolean;
  experiments?: ServerExperiments;
};

let cached: ServerFeatureFlags | null = null;

export function clearServerFeatureFlagsCache(): void {
  cached = null;
}

export async function fetchServerFeatureFlags(): Promise<ServerFeatureFlags> {
  if (cached) return cached;
  const base = `${getApiOrigin()}/api/v1`;
  const r = await fetch(`${base}/config/feature-flags`);
  if (!r.ok) return {};
  const data = (await r.json()) as { flags?: ServerFeatureFlags };
  cached = data.flags ?? {};
  return cached;
}

export function useServerFeatureFlags(): ServerFeatureFlags {
  const [flags, setFlags] = useState<ServerFeatureFlags>(cached ?? {});

  useEffect(() => {
    let cancelled = false;
    void fetchServerFeatureFlags().then((f) => {
      if (!cancelled) setFlags(f);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return flags;
}

import { ODDS_DISPLAY_ENABLED, PLAYER_PROPS_ENABLED } from '../constants/featureFlags';
import type { ServerFeatureFlags } from '../hooks/useServerFeatureFlags';

export function isOddsDisplayEnabled(flags: ServerFeatureFlags): boolean {
  if (typeof flags.odds_display === 'boolean') return flags.odds_display;
  return ODDS_DISPLAY_ENABLED;
}

export function isPlayerPropsEnabled(flags: ServerFeatureFlags): boolean {
  if (typeof flags.player_props === 'boolean') return flags.player_props;
  return PLAYER_PROPS_ENABLED;
}

export function trialDaysFromServer(flags: ServerFeatureFlags): number {
  const days = flags.experiments?.trial_length_days;
  if (typeof days === 'number' && days >= 1 && days <= 30) return Math.round(days);
  return 7;
}

export function adDensitySpacing(flags: ServerFeatureFlags): number {
  const density = (flags.experiments?.ad_density || 'normal').toLowerCase();
  if (density === 'low') return 10;
  if (density === 'high') return 4;
  return 6;
}

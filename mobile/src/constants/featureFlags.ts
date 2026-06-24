/**
 * Feature flags — off by default in production until data/licensing is ready.
 */
export const PLAYER_PROPS_ENABLED =
  process.env.EXPO_PUBLIC_PLAYER_PROPS_ENABLED === 'true';

/** Market consensus lines on Game Detail (M-01). Uses CLEARSPORTS_API_KEY on backend when set. */
export const ODDS_DISPLAY_ENABLED =
  process.env.EXPO_PUBLIC_ODDS_DISPLAY_ENABLED === 'true';

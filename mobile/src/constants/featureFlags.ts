/**
 * Feature flags — off by default in production until data/licensing is ready.
 */
export const PLAYER_PROPS_ENABLED =
  process.env.EXPO_PUBLIC_PLAYER_PROPS_ENABLED === 'true';

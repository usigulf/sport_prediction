export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.sportoracle.com';
export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.sportoracle.com/ws';

export const APP_CONFIG = {
  name: 'SportOracle',
  version: '1.0.0',
  queryStaleTime: 1000 * 60 * 5, // 5 minutes
  cacheTime: 1000 * 60 * 60, // 1 hour
};

export const SPORTS = [
  { id: 'nba', name: 'NBA', active: true },
  { id: 'nfl', name: 'NFL', active: true },
  { id: 'mlb', name: 'MLB', active: true },
  { id: 'nhl', name: 'NHL', active: true },
  { id: 'ncaab', name: 'NCAAB', active: true },
  { id: 'ncaaf', name: 'NCAAF', active: true },
  { id: 'soccer', name: 'Soccer', active: true },
] as const;

export const SUBSCRIPTION_FEATURES = {
  free: {
    sports: 3,
    liveUpdates: false,
    playerProps: false,
    scenarioEngine: false,
    maxAlerts: 3,
    apiAccess: false,
  },
  pro: {
    sports: 'all',
    liveUpdates: true,
    playerProps: true,
    scenarioEngine: false,
    maxAlerts: 5,
    apiAccess: false,
  },
  elite: {
    sports: 'all',
    liveUpdates: true,
    playerProps: true,
    scenarioEngine: true,
    maxAlerts: 'unlimited',
    apiAccess: false,
  },
  api: {
    sports: 'all',
    liveUpdates: true,
    playerProps: true,
    scenarioEngine: true,
    maxAlerts: 'unlimited',
    apiAccess: true,
  },
} as const;

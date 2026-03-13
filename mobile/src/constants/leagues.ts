/**
 * League/sport options for filters (Games, Favorites).
 * Matches backend ALLOWED_LEAGUE_CODES; display labels for FanDuel-style UI.
 * Soccer groups Premier League + Champions League under one pill.
 */
export const SOCCER_LEAGUE_IDS = ['premier_league', 'champions_league'] as const;

export const SPORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'nfl', label: 'NFL' },
  { id: 'nba', label: 'NBA' },
  { id: 'mlb', label: 'MLB' },
  { id: 'nhl', label: 'NHL' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'golf', label: 'Golf' },
  { id: 'mma', label: 'MMA' },
];

/** 6 sports for Home screen quick filter row (circular icons). */
export const HOME_SPORT_IDS = ['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'golf'] as const;

export const MY_LEAGUES_ID = 'my_leagues';

/** For FavoritesScreen add-league list (same ids as backend allows) */
export const AVAILABLE_LEAGUES = [
  { id: 'nfl', name: 'NFL' },
  { id: 'nba', name: 'NBA' },
  { id: 'premier_league', name: 'Premier League' },
  { id: 'mlb', name: 'MLB' },
  { id: 'champions_league', name: 'Champions League' },
  { id: 'nhl', name: 'NHL' },
  { id: 'boxing', name: 'Boxing' },
  { id: 'tennis', name: 'Tennis' },
  { id: 'golf', name: 'Golf' },
  { id: 'mma', name: 'MMA' },
];

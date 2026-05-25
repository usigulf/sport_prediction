/**
 * League/sport options for filters (Games, Favorites).
 * Set EXPO_PUBLIC_BETA_SOCCER_ONLY=true for soccer-only beta (hides NFL/NBA in UI).
 */
import Constants from 'expo-constants';

const extra =
  (Constants.expoConfig?.extra as { betaSoccerOnly?: boolean } | undefined) ?? {};
export const BETA_SOCCER_ONLY =
  extra.betaSoccerOnly === true ||
  process.env.EXPO_PUBLIC_BETA_SOCCER_ONLY === 'true';
/** Backend soccer codes with optional Sportradar season envs; "all soccer" API filter. */
export const SOCCER_LEAGUE_IDS = [
  'premier_league',
  'champions_league',
  'la_liga',
  'serie_a',
  'bundesliga',
  'mls',
] as const;

/** Marketing/onboarding copy — keep aligned with SOCCER_LEAGUE_IDS. */
export const SOCCER_COMPETITIONS_DISPLAY =
  'Premier League, Champions League, La Liga, Serie A, Bundesliga, and MLS';

const _SOCCER_ID_SET = new Set<string>(SOCCER_LEAGUE_IDS);

/** True when `league` is a backend soccer competition id (not the umbrella "soccer" hub id). */
export function isSoccerLeague(league: string | undefined | null): boolean {
  return !!league && _SOCCER_ID_SET.has(league);
}

export const SPORT_OPTIONS: { id: string; label: string }[] = BETA_SOCCER_ONLY
  ? [{ id: 'soccer', label: 'Soccer' }]
  : [
      { id: 'nfl', label: 'NFL' },
      { id: 'nba', label: 'NBA' },
      { id: 'soccer', label: 'Soccer' },
    ];

/** Home screen quick filters */
export const HOME_SPORT_IDS = BETA_SOCCER_ONLY
  ? (['soccer'] as const)
  : (['soccer', 'nfl', 'nba'] as const);

export const MY_LEAGUES_ID = 'my_leagues';

/** Favorites → add league (competition-level ids). */
const _ALL_LEAGUES = [
  { id: 'nfl', name: 'NFL' },
  { id: 'nba', name: 'NBA' },
  { id: 'premier_league', name: 'Premier League' },
  { id: 'champions_league', name: 'Champions League' },
  { id: 'la_liga', name: 'La Liga' },
  { id: 'serie_a', name: 'Serie A' },
  { id: 'bundesliga', name: 'Bundesliga' },
  { id: 'mls', name: 'MLS' },
];

export const AVAILABLE_LEAGUES = BETA_SOCCER_ONLY
  ? _ALL_LEAGUES.filter((l) => isSoccerLeague(l.id))
  : _ALL_LEAGUES;

/** Selectable league rows: six soccer competitions + NFL + NBA. */
export const AVAILABLE_LEAGUES_COUNT = AVAILABLE_LEAGUES.length;

/** Games tab — “All” sport filter */
export const GAMES_ALL_SPORTS_SUBTITLE = BETA_SOCCER_ONLY
  ? `${AVAILABLE_LEAGUES_COUNT} soccer competitions — pick a league, then a view`
  : `${AVAILABLE_LEAGUES_COUNT} leagues — ${SOCCER_LEAGUE_IDS.length} soccer, NFL & NBA — pick a sport, then a view`;

export const PRODUCT_SCOPE_LONG_DESCRIPTION = BETA_SOCCER_ONLY
  ? `Soccer: ${SOCCER_COMPETITIONS_DISPLAY}`
  : `${AVAILABLE_LEAGUES_COUNT} leagues: soccer (${SOCCER_COMPETITIONS_DISPLAY}), NFL, and NBA`;

export const LANDING_HERO_SUBHEADLINE = `${PRODUCT_SCOPE_LONG_DESCRIPTION}. Informational picks and tracked accuracy. Not betting advice.`;

export const LANDING_FEATURE_PREDICTIONS_DESC = BETA_SOCCER_ONLY
  ? `Win probabilities for ${SOCCER_COMPETITIONS_DISPLAY} — with transparency on methodology.`
  : `Win probabilities for ${SOCCER_LEAGUE_IDS.length} soccer leagues (${SOCCER_COMPETITIONS_DISPLAY}), plus NFL and NBA — with transparency on methodology.`;

export const ONBOARDING_LEAGUES_SUBTITLE = BETA_SOCCER_ONLY
  ? `Pick your soccer competitions (${SOCCER_COMPETITIONS_DISPLAY}). We use these for Best Picks and Favorites; change anytime in Favorites.`
  : `Pick from ${AVAILABLE_LEAGUES_COUNT} leagues — soccer includes ${SOCCER_COMPETITIONS_DISPLAY}; plus NFL and NBA. We use these for Best Picks and Favorites; you can change them anytime in Favorites.`;

export const HOME_HERO_EMPTY_TAGLINE = BETA_SOCCER_ONLY
  ? `Free daily picks · ${SOCCER_COMPETITIONS_DISPLAY} · Accuracy tracked in-app`
  : `Free daily picks · ${AVAILABLE_LEAGUES_COUNT} leagues — Soccer · NFL · NBA · Accuracy tracked in-app`;

export const PRICING_FREE_LEAGUES_LINE = BETA_SOCCER_ONLY
  ? `Basic picks (${SOCCER_COMPETITIONS_DISPLAY}), limited daily views`
  : `Basic picks (${AVAILABLE_LEAGUES_COUNT} leagues: soccer, NFL, NBA), limited daily views`;

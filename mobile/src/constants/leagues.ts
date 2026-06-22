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

/** Marketing/onboarding copy — generic wording (no third-party league trademarks). */
export const SOCCER_COMPETITIONS_DISPLAY =
  'major international soccer competitions';

/** App Store / landing hero — no league or team trademarks. */
export const MARKETING_SCOPE_LINE =
  'Coverage across major professional football, basketball, and soccer competitions worldwide';

export const MARKETING_SCOPE_SHORT =
  'AI-powered predictions and analytics across major North American and international sports competitions';

/** @deprecated Use MARKETING_SCOPE_LINE — kept for imports */
export const APP_STORE_LEAGUES_LINE = MARKETING_SCOPE_LINE;

/** All supported competition codes (NFL, NBA, six soccer leagues). */
export const PRODUCT_LEAGUE_IDS = [
  'nfl',
  'nba',
  ...SOCCER_LEAGUE_IDS,
] as const;

export const PRODUCT_LEAGUES_CSV = PRODUCT_LEAGUE_IDS.join(',');

const _SOCCER_ID_SET = new Set<string>(SOCCER_LEAGUE_IDS);
const _PRODUCT_LEAGUE_ORDER = new Map<string, number>(
  PRODUCT_LEAGUE_IDS.map((id, i) => [id, i]),
);

/** Stable section order on Home (NFL → NBA → soccer competitions). */
export function compareLeagueDisplayOrder(a: string, b: string): number {
  const ia = _PRODUCT_LEAGUE_ORDER.get(a) ?? 999;
  const ib = _PRODUCT_LEAGUE_ORDER.get(b) ?? 999;
  if (ia !== ib) return ia - ib;
  return a.localeCompare(b);
}

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

/** Home screen quick filters (NFL & NBA first when full product). */
export const HOME_SPORT_IDS = BETA_SOCCER_ONLY
  ? (['soccer'] as const)
  : (['nfl', 'nba', 'soccer'] as const);

export const MY_LEAGUES_ID = 'my_leagues';

/** Favorites / onboarding league tabs — real league names for navigation. */
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

/** Games tab — “All” sport filter (navigation; league names OK here). */
export const GAMES_ALL_SPORTS_SUBTITLE = BETA_SOCCER_ONLY
  ? `${AVAILABLE_LEAGUES_COUNT} soccer competitions — pick a league, then a view`
  : `${AVAILABLE_LEAGUES_COUNT} leagues — ${SOCCER_LEAGUE_IDS.length} soccer, NFL & NBA — pick a sport, then a view`;

export const PRODUCT_SCOPE_LONG_DESCRIPTION = BETA_SOCCER_ONLY
  ? `Soccer: ${SOCCER_COMPETITIONS_DISPLAY}`
  : MARKETING_SCOPE_LINE;

export const LANDING_HERO_SUBHEADLINE = `${MARKETING_SCOPE_LINE}. Informational picks and tracked accuracy. Not betting advice.`;

export const LANDING_FEATURE_PREDICTIONS_DESC = BETA_SOCCER_ONLY
  ? `Win probabilities for ${SOCCER_COMPETITIONS_DISPLAY} — with transparency on methodology.`
  : 'Win probabilities for major professional competitions — with transparency on methodology.';

export const ONBOARDING_LEAGUES_SUBTITLE = BETA_SOCCER_ONLY
  ? `Pick your soccer competitions (${SOCCER_COMPETITIONS_DISPLAY}). We use these for Best Picks and Favorites; change anytime in Favorites.`
  : 'Choose competitions for Best Picks and Favorites. You can change these anytime in Favorites.';

export const HOME_HERO_EMPTY_TAGLINE = BETA_SOCCER_ONLY
  ? `Free daily picks · ${SOCCER_COMPETITIONS_DISPLAY} · Accuracy tracked in-app`
  : 'Free daily picks · Multiple competitions · Accuracy tracked in-app';

export const PRICING_FREE_LEAGUES_LINE = BETA_SOCCER_ONLY
  ? `Basic picks (${SOCCER_COMPETITIONS_DISPLAY}), limited daily views`
  : 'Basic picks across major competitions, limited daily views';

export const HOME_HEADER_SUBTITLE = BETA_SOCCER_ONLY
  ? 'AI soccer picks · tracked accuracy'
  : 'AI picks · tracked accuracy';

export const AUTH_SCREEN_TAGLINE = BETA_SOCCER_ONLY
  ? 'AI-Powered Soccer Predictions'
  : 'AI-Powered Sports Predictions';

export const LIVE_HUB_SUBTITLE = BETA_SOCCER_ONLY
  ? "Live scores & in-play win probabilities refresh every minute"
  : "Live in-play picks plus today's top pre-game plays";

/**
 * Team crest URLs + CDN loading helpers.
 * Keep soccer map aligned with backend `app/utils/team_logo_urls.py`.
 *
 * Some CDNs (e.g. ESPN) reject React Native's default User-Agent — always send a browser-like UA.
 */

/** Third-party team/league marks are not shown (trademark / App Store compliance). */
export const TEAM_LOGOS_ENABLED = false;

/** Minimal fields for resolving a crest URL (full `Team` or nested game team). */
export type TeamLogoFields = {
  league?: string;
  abbreviation?: string | null;
  logo_url?: string | null;
};

/** English Premier League — ESPN crest ids (matches backend `_PL_ENG`). */
const PL_ENG: Record<string, number> = {
  BOU: 349,
  ARS: 359,
  AVL: 362,
  BRE: 337,
  BHA: 331,
  BUR: 379,
  CHE: 363,
  CRY: 384,
  EVE: 368,
  FUL: 370,
  LEE: 357,
  LIV: 364,
  MNC: 382,
  MAN: 360,
  NEW: 361,
  NFO: 393,
  SUN: 366,
  TOT: 367,
  WHU: 371,
  WOL: 380,
};

const PL_ALIAS: Record<string, string> = {
  MCI: 'MNC',
  MUN: 'MAN',
};

/** Mirror backend SOCCER_ESPN_IDS — key `${league}|${ABBREV}` */
const SOCCER_ESPN_ID: Record<string, number> = {
  'champions_league|RMA': 86,
  'champions_league|BAR': 83,
  'champions_league|BAY': 132,
  'champions_league|PSG': 160,
  'champions_league|INT': 110,
  'la_liga|ATM': 1068,
  'la_liga|SEV': 243,
  'la_liga|RSO': 278,
  'la_liga|VIL': 102,
  'la_liga|ATH': 93,
  'la_liga|BET': 244,
  'serie_a|JUV': 111,
  'serie_a|MIL': 103,
  'serie_a|NAP': 114,
  'serie_a|ROM': 104,
  'serie_a|LAZ': 115,
  'serie_a|FIO': 322,
  'bundesliga|BVB': 124,
  'bundesliga|RBL': 175,
  'bundesliga|B04': 131,
  'bundesliga|SGE': 125,
  'bundesliga|VFB': 134,
  'bundesliga|WOB': 138,
  'mls|LAFC': 18269,
  'mls|MIA': 19300,
  'mls|CLB': 183,
  'mls|SEA': 819,
  'mls|ATL': 18418,
  'mls|NYC': 176,
};

for (const [ab, sid] of Object.entries(PL_ENG)) {
  SOCCER_ESPN_ID[`premier_league|${ab}`] = sid;
  SOCCER_ESPN_ID[`champions_league|${ab}`] = sid;
}
for (const [alias, canon] of Object.entries(PL_ALIAS)) {
  const sid = PL_ENG[canon];
  if (sid != null) {
    SOCCER_ESPN_ID[`premier_league|${alias}`] = sid;
    SOCCER_ESPN_ID[`champions_league|${alias}`] = sid;
  }
}

/** Sent with remote logo requests — avoids empty images when CDN filters unknown clients. */
export const CDN_IMAGE_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'image/png,image/webp,image/*,*/*;q=0.8',
};

export function cdnImageSource(uri: string): { uri: string; headers: Record<string, string> } {
  return { uri, headers: CDN_IMAGE_HEADERS };
}

function nflEspnLogoUrls(abbr: string): string[] {
  const ab = abbr.trim().toUpperCase();
  if (ab === 'WAS') {
    return [
      'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png',
      'https://a.espncdn.com/i/teamlogos/nfl/500/was.png',
    ];
  }
  return [`https://a.espncdn.com/i/teamlogos/nfl/500/${ab.toLowerCase()}.png`];
}

function constructedLogoUris(team: TeamLogoFields, gameLeague: string): string[] {
  const ab = (team.abbreviation || '').trim().toUpperCase();
  if (!ab) return [];
  const lg = ((team.league || gameLeague || '') as string).toLowerCase();
  if (lg === 'nfl') {
    return nflEspnLogoUrls(ab);
  }
  if (lg === 'nba') {
    return [`https://a.espncdn.com/i/teamlogos/nba/500/${ab.toLowerCase()}.png`];
  }
  const sid = SOCCER_ESPN_ID[`${lg}|${ab}`];
  if (sid != null) {
    return [`https://a.espncdn.com/i/teamlogos/soccer/500/${sid}.png`];
  }
  return [];
}

/**
 * Ordered list of URLs to try (API crest first, then ESPN fallbacks). Use with `TeamCrestImage`
 * so a broken provider URL still resolves via abbreviation.
 */
export function teamLogoUriCandidates(
  team: TeamLogoFields | null | undefined,
  gameLeague?: string | null
): string[] {
  if (!TEAM_LOGOS_ENABLED || !team) return [];
  const raw = (team.logo_url || '').trim();
  const fromApi =
    raw && !raw.startsWith('https://example.com') ? [raw] : [];
  const built = constructedLogoUris(team, (gameLeague || '') as string);
  const out: string[] = [];
  const push = (u: string) => {
    if (u && !out.includes(u)) out.push(u);
  };
  for (const u of fromApi) push(u);
  for (const u of built) push(u);
  return out;
}

/**
 * First candidate URL (backward compatible).
 * Pass `gameLeague` when `team.league` might be missing on nested JSON.
 */
export function displayTeamLogoUri(
  team: TeamLogoFields | null | undefined,
  gameLeague?: string | null
): string | undefined {
  return teamLogoUriCandidates(team, gameLeague)[0];
}

import { BETA_SOCCER_ONLY, SOCCER_LEAGUE_IDS } from '../constants/leagues';
import { formatLocalYMD } from './soccerWeek';

/** Query params for games/feed — always scopes to the user's local calendar day. */
export function soccerBetaFetchParams(): {
  date: string;
  time_zone: string;
  leagues?: string;
} {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base = {
    date: formatLocalYMD(new Date()),
    time_zone: tz,
  };
  if (!BETA_SOCCER_ONLY) {
    return base;
  }
  return {
    ...base,
    leagues: SOCCER_LEAGUE_IDS.join(','),
  };
}

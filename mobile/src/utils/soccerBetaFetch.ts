import { BETA_SOCCER_ONLY } from '../constants/leagues';
import { formatLocalYMD } from './soccerWeek';

/** Query params for games/feed when EXPO_PUBLIC_BETA_SOCCER_ONLY=true */
export function soccerBetaFetchParams(): {
  date?: string;
  time_zone?: string;
  leagues?: string;
} {
  if (!BETA_SOCCER_ONLY) {
    return {};
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    date: formatLocalYMD(new Date()),
    time_zone: tz,
    leagues: 'premier_league',
  };
}

import type { ImageSourcePropType } from 'react-native';
import { TEAM_LOGOS_ENABLED } from '../utils/teamLogoUrl';

/** Bundled marks for Home shortcuts (disabled when TEAM_LOGOS_ENABLED is false). */
export const HOME_SPORT_LOGO: Record<'soccer' | 'nfl' | 'nba', ImageSourcePropType> = {
  soccer: require('../../assets/sports/soccer.png'),
  nfl: require('../../assets/sports/nfl.png'),
  nba: require('../../assets/sports/nba.png'),
};

export function leagueBadgeSource(leagueId: string): ImageSourcePropType | null {
  if (!TEAM_LOGOS_ENABLED) return null;
  const id = leagueId.toLowerCase();
  if (id === 'nfl') return HOME_SPORT_LOGO.nfl;
  if (id === 'nba') return HOME_SPORT_LOGO.nba;
  if (
    id === 'soccer' ||
    id === 'premier_league' ||
    id === 'champions_league' ||
    id === 'la_liga' ||
    id === 'serie_a' ||
    id === 'bundesliga' ||
    id === 'mls'
  ) {
    return HOME_SPORT_LOGO.soccer;
  }
  return null;
}

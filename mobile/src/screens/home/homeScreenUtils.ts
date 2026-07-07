import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList } from '../../navigation/AppNavigator';

export const LIVE_GAMES_POLL_MS = 60_000;

export type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

export function formatCachedAt(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function getSportIcon(leagueId: string): keyof typeof Ionicons.glyphMap {
  switch (leagueId) {
    case 'nfl':
      return 'football';
    case 'nba':
      return 'basketball';
    case 'soccer':
    case 'premier_league':
    case 'champions_league':
    case 'la_liga':
    case 'serie_a':
    case 'bundesliga':
    case 'mls':
      return 'football';
    default:
      return 'football-outline';
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

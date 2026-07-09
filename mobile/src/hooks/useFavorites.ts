import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useUpcomingGamesQuery } from './useUpcomingGamesQuery';

export type FavoriteTeam = { id: string; name: string };
export type FavoriteLeague = { id: string; name: string };
export type FavoritesData = {
  teams: FavoriteTeam[];
  leagues: FavoriteLeague[];
};

export const FAVORITES_QUERY_KEY = ['favorites'] as const;

function favoritesFingerprint(data: FavoritesData | undefined): string {
  if (!data) return '';
  const teams = (data.teams ?? []).map((t) => t.id).sort().join(',');
  const leagues = (data.leagues ?? []).map((l) => l.id).sort().join(',');
  return `${teams}|${leagues}`;
}

export function useFavoritesQuery() {
  const prevFingerprint = useRef<string>('');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const query = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: async () => {
      const data = (await apiService.getFavorites()) as FavoritesData;
      return {
        teams: data.teams ?? [],
        leagues: data.leagues ?? [],
      };
    },
  });

  useEffect(() => {
    if (!query.data || query.isFetching) return;
    const fp = favoritesFingerprint(query.data);
    if (prevFingerprint.current && prevFingerprint.current !== fp) {
      setSyncNotice('Favorites updated from your account');
    }
    prevFingerprint.current = fp;
  }, [query.data, query.isFetching]);

  return { ...query, syncNotice, clearSyncNotice: () => setSyncNotice(null) };
}

export function useFavoriteTeamIds(): Set<string> {
  const { data } = useFavoritesQuery();
  return new Set((data?.teams ?? []).map((t) => t.id));
}

export function useFavoriteGames() {
  const { data: favorites } = useFavoritesQuery();
  const leagueIds = favorites?.leagues?.map((l) => l.id) ?? [];
  const teamIds = new Set(favorites?.teams?.map((t) => t.id) ?? []);

  const gamesQuery = useUpcomingGamesQuery({
    leagues: leagueIds.length > 0 ? leagueIds.join(',') : undefined,
    limit: 50,
  });

  const games = gamesQuery.data?.games ?? [];
  const filtered =
    teamIds.size === 0
      ? games
      : games.filter(
          (g) =>
            teamIds.has(g.home_team_id) ||
            teamIds.has(g.away_team_id) ||
            leagueIds.includes(g.league),
        );

  return {
    ...gamesQuery,
    games: filtered,
    favorites,
  };
}

export function useFavoriteMutations() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });

  const addLeague = useMutation({
    mutationFn: (leagueId: string) => apiService.addFavoriteLeague(leagueId),
    onSuccess: invalidate,
  });

  const removeLeague = useMutation({
    mutationFn: (leagueCode: string) => apiService.removeFavoriteLeague(leagueCode),
    onSuccess: invalidate,
  });

  const addTeam = useMutation({
    mutationFn: (teamId: string) => apiService.addFavoriteTeam(teamId),
    onSuccess: invalidate,
  });

  const removeTeam = useMutation({
    mutationFn: (teamId: string) => apiService.removeFavoriteTeam(teamId),
    onSuccess: invalidate,
  });

  return { addLeague, removeLeague, addTeam, removeTeam };
}

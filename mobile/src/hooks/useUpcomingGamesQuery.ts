import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { Game } from '../types';
import { readGamesCache, writeGamesCache } from '../query/gamesCache';
import { useNetworkStatus } from './useNetworkStatus';

export type UpcomingGamesParams = {
  league?: string;
  leagues?: string;
  date?: string;
  time_zone?: string;
  limit?: number;
};

export type UpcomingGamesResult = {
  games: Game[];
  updatedAt: string;
};

export function upcomingGamesQueryKey(params: UpcomingGamesParams = {}) {
  return [
    'upcomingGames',
    params.league ?? null,
    params.leagues ?? null,
    params.date ?? null,
    params.time_zone ?? null,
    params.limit ?? null,
  ] as const;
}

type UseUpcomingGamesQueryOptions = {
  enabled?: boolean;
};

export function useUpcomingGamesQuery(
  params: UpcomingGamesParams = {},
  options?: UseUpcomingGamesQueryOptions,
) {
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const queryKey = upcomingGamesQueryKey(params);
  const enabled = (options?.enabled ?? true) && isOffline !== true;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readGamesCache(queryKey);
      if (cancelled || !cached) return;
      if (!queryClient.getQueryData<UpcomingGamesResult>(queryKey)) {
        queryClient.setQueryData(queryKey, cached);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient, queryKey]);

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await apiService.getUpcomingGames({ ...params, signal });
      const games = (response.games ?? []) as Game[];
      const updatedAt = new Date().toISOString();
      const result: UpcomingGamesResult = { games, updatedAt };
      await writeGamesCache(queryKey, result);
      return result;
    },
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

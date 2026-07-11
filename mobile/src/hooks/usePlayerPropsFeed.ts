import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import type { PlayerPropsFeedItem } from '../components/playerProps/PlayerPropsFeedCard';

type FeedParams = {
  league?: string;
  leagues?: string;
  limit?: number;
  date?: string;
  time_zone?: string;
};

export function usePlayerPropsFeed(params: FeedParams, enabled: boolean) {
  const [items, setItems] = useState<PlayerPropsFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setError(null);
      setDisclaimer(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getPlayerPropsFeed(params);
      setItems((res.items ?? []) as PlayerPropsFeedItem[]);
      setDisclaimer(res.disclaimer ?? null);
    } catch (e: unknown) {
      setItems([]);
      setDisclaimer(null);
      setError(getUserFriendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    params.league,
    params.leagues,
    params.limit,
    params.date,
    params.time_zone,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, disclaimer, refetch: load };
}

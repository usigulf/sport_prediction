import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { getUserFriendlyMessage } from '../../utils/errorMessages';
import { soccerBetaFetchParams } from '../../utils/soccerBetaFetch';
import { useUpcomingGamesQuery } from '../../hooks/useUpcomingGamesQuery';
import { hasProAccess } from '../../utils/subscription';

export function useHomeScreenData(isAuthenticated: boolean, userSubscriptionTier?: string) {
  const {
    data: gamesData,
    isLoading: gamesLoading,
    isError: gamesIsError,
    error: gamesError,
    refetch: refetchGames,
  } = useUpcomingGamesQuery({ limit: 30, ...soccerBetaFetchParams() });

  const upcomingGames = gamesData?.games ?? [];
  const cachedAt = gamesData?.updatedAt ?? null;
  const loading = gamesLoading && upcomingGames.length === 0;
  const loadError = gamesIsError ? getUserFriendlyMessage(gamesError) : null;

  const [refreshing, setRefreshing] = useState(false);
  const [forYouPicks, setForYouPicks] = useState<any[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [forYouError, setForYouError] = useState<string | null>(null);
  const [accuracyPct, setAccuracyPct] = useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [challengeCount, setChallengeCount] = useState<number>(0);
  const [premiumTeaserDismissed, setPremiumTeaserDismissed] = useState(false);
  const [trendingPicks, setTrendingPicks] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [favoritesCount, setFavoritesCount] = useState<{ leagues: number; teams: number } | null>(
    null
  );
  const [selectedFeaturedId, setSelectedFeaturedId] = useState<string | null>(null);

  const loadForYou = useCallback(async () => {
    setForYouLoading(true);
    setForYouError(null);
    try {
      const beta = soccerBetaFetchParams();
      const res = await apiService.getForYouFeed({
        leagues: beta.leagues,
        date: beta.date,
        time_zone: beta.time_zone,
        limit: 10,
      });
      setForYouPicks(res.picks ?? []);
    } catch (e) {
      setForYouError(getUserFriendlyMessage(e));
      setForYouPicks([]);
    } finally {
      setForYouLoading(false);
    }
  }, []);

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      const res = await apiService.getTopPicks({ limit: 6, ...soccerBetaFetchParams() });
      setTrendingPicks(res.picks ?? []);
    } catch (e) {
      setTrendingError(getUserFriendlyMessage(e));
      setTrendingPicks([]);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  const loadChallengeCount = useCallback(async (tier: string) => {
    if (!hasProAccess(tier)) {
      setChallengeCount(0);
      return;
    }
    try {
      const r = await apiService.getChallenges({ limit: 50 });
      setChallengeCount(r?.count ?? r?.challenges?.length ?? 0);
    } catch {
      setChallengeCount(0);
    }
  }, []);

  useEffect(() => {
    void loadForYou();
  }, [loadForYou]);

  useEffect(() => {
    void loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    apiService
      .getAccuracy()
      .then((d) => {
        if (d?.accuracy_pct != null) setAccuracyPct(Math.round(d.accuracy_pct));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoritesCount(null);
      setChallengeCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      let tier = userSubscriptionTier ?? subscriptionTier;
      try {
        const u = (await apiService.getCurrentUser()) as { subscription_tier?: string };
        if (u?.subscription_tier) {
          tier = u.subscription_tier;
          if (!cancelled) setSubscriptionTier(u.subscription_tier);
        }
      } catch {
        /* profile optional for home */
      }
      if (!cancelled) await loadChallengeCount(tier);
      if (!cancelled) {
        try {
          const favs = (await apiService.getFavorites()) as {
            leagues?: unknown[];
            teams?: unknown[];
          };
          setFavoritesCount({
            leagues: favs?.leagues?.length ?? 0,
            teams: favs?.teams?.length ?? 0,
          });
        } catch {
          setFavoritesCount(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadChallengeCount, userSubscriptionTier]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchGames(),
      loadForYou(),
      loadTrending(),
      apiService
        .getAccuracy()
        .then((d) => {
          if (d?.accuracy_pct != null) setAccuracyPct(Math.round(d.accuracy_pct));
        })
        .catch(() => {}),
      isAuthenticated
        ? apiService
            .getCurrentUser()
            .then((u: { subscription_tier?: string }) => {
              if (u?.subscription_tier) setSubscriptionTier(u.subscription_tier);
              return loadChallengeCount(u?.subscription_tier ?? subscriptionTier);
            })
            .catch(() => loadChallengeCount(subscriptionTier))
        : Promise.resolve(),
      isAuthenticated
        ? apiService
            .getFavorites()
            .then((favs: unknown) => {
              const f = favs as { leagues?: unknown[]; teams?: unknown[] };
              setFavoritesCount({
                leagues: f?.leagues?.length ?? 0,
                teams: f?.teams?.length ?? 0,
              });
            })
            .catch(() => setFavoritesCount(null))
        : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [
    isAuthenticated,
    loadChallengeCount,
    loadForYou,
    loadTrending,
    refetchGames,
    subscriptionTier,
  ]);

  const gamesByLeague = upcomingGames.reduce(
    (acc, game) => {
      const league = game.league || 'other';
      if (!acc[league]) acc[league] = [];
      acc[league].push(game);
      return acc;
    },
    {} as Record<string, typeof upcomingGames>
  );

  const defaultFeatured = upcomingGames.find((g) => g.prediction) || upcomingGames[0];
  const featuredGame = selectedFeaturedId
    ? (upcomingGames.find((g) => g.id === selectedFeaturedId) ?? defaultFeatured)
    : defaultFeatured;
  const liveGames = upcomingGames.filter((g) => g.status === 'live');

  return {
    upcomingGames,
    cachedAt,
    loading,
    loadError,
    refreshing,
    onRefresh,
    forYouPicks,
    forYouLoading,
    forYouError,
    loadForYou,
    accuracyPct,
    subscriptionTier,
    challengeCount,
    premiumTeaserDismissed,
    setPremiumTeaserDismissed,
    trendingPicks,
    trendingLoading,
    trendingError,
    loadTrending,
    favoritesCount,
    selectedFeaturedId,
    setSelectedFeaturedId,
    gamesByLeague,
    featuredGame,
    liveGames,
    refetchGames,
  };
}

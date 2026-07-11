import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { normalizeSubscriptionTier, type NormalizedTier } from '../utils/subscription';
import { useAppSelector } from '../store/hooks';
import { subscriptionTierQueryKey } from '../query/serverQueryKeys';

export { subscriptionTierQueryKey } from '../query/serverQueryKeys';

/**
 * Cached subscription tier — shared across Home, GameDetail, and other screens
 * so each mount does not call GET /user/me independently.
 */
export function useSubscriptionTier() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const userId = useAppSelector((s) => s.auth.user?.id);
  const authTier = useAppSelector((s) =>
    normalizeSubscriptionTier(s.auth.user?.subscriptionTier),
  );

  const query = useQuery({
    queryKey: subscriptionTierQueryKey(userId),
    queryFn: async () => {
      const user = (await apiService.getCurrentUser()) as { subscription_tier?: string };
      return normalizeSubscriptionTier(user?.subscription_tier);
    },
    enabled: isAuthenticated && Boolean(userId),
    staleTime: 60_000,
  });

  const subscriptionTier: NormalizedTier = isAuthenticated
    ? (query.data ?? authTier ?? 'free')
    : 'free';

  return {
    subscriptionTier,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

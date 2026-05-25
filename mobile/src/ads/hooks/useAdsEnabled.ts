import { useAppSelector } from '../../store/hooks';
import { hasPremiumAccess } from '../../utils/subscription';

/** Free-tier users see ads; Premium/Pro subscribers do not. */
export function useAdsEnabled(): boolean {
  const tier = useAppSelector((s) => s.auth.user?.subscriptionTier ?? 'free');
  return !hasPremiumAccess(tier);
}

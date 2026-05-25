/**
 * Mediation / waterfall placeholder.
 * Wire AppLovin MAX + Unity adapters in native projects, then reorder here.
 *
 * Fallback order intent: admob → applovin → unity → house
 */
export type MediationTier = 'admob' | 'applovin' | 'unity' | 'house';

export function mediationOrder(preferPremium: boolean): MediationTier[] {
  const base: MediationTier[] = ['admob', 'applovin', 'unity', 'house'];
  if (preferPremium) {
    return ['admob', 'applovin', 'unity', 'house'];
  }
  return base;
}

/** When true, UI should render a house promo instead of holding an empty slot. */
export function shouldFallbackToHouse(
  attempts: Partial<Record<MediationTier, boolean>>,
): boolean {
  const tried = mediationOrder(false).filter((t) => t !== 'house');
  return tried.every((t) => attempts[t] === false);
}

export type MergedRow<T> =
  | { kind: 'item'; id: string; item: T }
  | { kind: 'ad'; id: string };

/**
 * Deterministic native rail injection: after every `spacing` content rows.
 */
export function mergeListWithNativeAds<T>(
  items: T[],
  keyOf: (item: T, index: number) => string,
  spacing: number,
): MergedRow<T>[] {
  if (spacing <= 0) {
    return items.map((item, i) => ({
      kind: 'item',
      id: keyOf(item, i),
      item,
    }));
  }
  const n = items.length;
  /** Short lists never reached `spacing` before; tighten interval so a slot still appears. */
  const useSpacing =
    n > 0 && spacing > n ? Math.max(2, Math.ceil(n / 2)) : spacing;
  const out: MergedRow<T>[] = [];
  let since = 0;
  items.forEach((item, i) => {
    out.push({ kind: 'item', id: keyOf(item, i), item });
    since += 1;
    if (since >= useSpacing) {
      out.push({ kind: 'ad', id: `ad-${keyOf(item, i)}` });
      since = 0;
    }
  });
  return out;
}

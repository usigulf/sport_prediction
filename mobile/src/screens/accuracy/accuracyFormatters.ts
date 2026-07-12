/** Shared formatters for the auditable accuracy scorecard. */

export function formatWindowStart(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatLastUpdated(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function accuracyBlockTotals(block: {
  total_games?: number;
  total?: number;
  correct?: number;
  accuracy_pct?: number;
}): { total: number; correct: number; pct: number | null } {
  const total = block.total ?? block.total_games ?? 0;
  const correct = block.correct ?? 0;
  const pct = block.accuracy_pct != null ? Number(block.accuracy_pct) : null;
  return { total, correct, pct };
}

export function humanizeCheckName(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const CONFIDENCE_ORDER = ['high', 'medium', 'low', 'unknown'] as const;

export function confidenceLabel(key: string): string {
  switch (key) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
    case 'unknown':
      return 'Not labeled';
    default:
      return key;
  }
}

/**
 * Relative freshness labels for pick cards (M-06).
 */

export function formatRelativeTimeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Short model label for freshness badge, e.g. "Model v1.0.0". */
export function formatModelVersionLabel(version: string | null | undefined): string | null {
  const raw = (version || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes('inplay') || lower.includes('in_play')) return 'In-play model';
  if (lower.includes('heuristic')) return 'Heuristic model';
  const cleaned = raw.replace(/^sklearn_/i, '').replace(/_/g, '.');
  return `Model ${cleaned}`;
}

export function buildPredictionFreshnessLabel(prediction: {
  model_version?: string | null;
  standings_last_updated_iso?: string | null;
  created_at?: string | null;
}): string | null {
  const parts: string[] = [];
  const standingsAgo = formatRelativeTimeAgo(prediction.standings_last_updated_iso);
  if (standingsAgo) {
    parts.push(`Standings updated ${standingsAgo}`);
  }
  const model = formatModelVersionLabel(prediction.model_version);
  if (model) parts.push(model);
  if (parts.length === 0) {
    const pickAgo = formatRelativeTimeAgo(prediction.created_at);
    if (pickAgo) parts.push(`Pick ${pickAgo}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Optional REST hook — POST ad session metrics to backend analytics. */
import { getApiOrigin } from '../../services/api';

export async function enqueueServerFlush(payload: unknown): Promise<void> {
  try {
    const origin = getApiOrigin();
    await fetch(`${origin}/api/v1/analytics/ad-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort telemetry; never block UI.
  }
}

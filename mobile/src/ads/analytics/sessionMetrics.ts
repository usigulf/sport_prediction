/** Optional REST hook — POST ad session metrics to backend analytics. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiOrigin } from '../../services/api';

const SESSION_COUNTER_KEY = '@octobetiQ/ad_session_counter_v1';
const ENGAGEMENT_SCORE_KEY = '@octobetiQ/ad_engagement_score_v1';
const SESSION_EVENT_COUNT_KEY = '@octobetiQ/ad_session_event_count_v1';
const SESSION_STARTED_AT_KEY = '@octobetiQ/ad_session_started_at_v1';

export async function enqueueServerFlush(payload: unknown): Promise<void> {
  try {
    const { canSendAdsTelemetry } = await import('../../utils/privacyPreferences');
    if (!(await canSendAdsTelemetry())) return;
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

export async function incrementSessionCounter(): Promise<number> {
  const raw = await AsyncStorage.getItem(SESSION_COUNTER_KEY);
  const next = Math.max(0, parseInt(raw ?? '0', 10)) + 1;
  await AsyncStorage.setItem(SESSION_COUNTER_KEY, String(next));
  return next;
}

export async function bumpEngagement(points: number): Promise<void> {
  const raw = await AsyncStorage.getItem(ENGAGEMENT_SCORE_KEY);
  const cur = Math.max(0, parseInt(raw ?? '0', 10));
  const next = cur + Math.max(0, points | 0);
  await AsyncStorage.setItem(ENGAGEMENT_SCORE_KEY, String(next));
}

export async function startAdSession(): Promise<void> {
  await AsyncStorage.multiSet([
    [SESSION_STARTED_AT_KEY, String(Date.now())],
    [SESSION_EVENT_COUNT_KEY, '0'],
  ]);
}

type TelemetryEvent = {
  kind: 'impression' | 'click' | 'reward_complete';
  screen: string;
  format?: string;
  network?: string;
  currency?: string;
  amount?: number;
};

export async function applyTelemetryEvent(ev: TelemetryEvent): Promise<void> {
  const raw = await AsyncStorage.getItem(SESSION_EVENT_COUNT_KEY);
  const nextCount = Math.max(0, parseInt(raw ?? '0', 10)) + 1;
  await AsyncStorage.setItem(SESSION_EVENT_COUNT_KEY, String(nextCount));
  if (ev.kind === 'click' || ev.kind === 'reward_complete') {
    await bumpEngagement(ev.kind === 'reward_complete' ? 3 : 1);
  }
}

export async function closeAdSessionPartial(): Promise<{
  events: number;
  startedAtMs: number;
} | null> {
  const [eventsRaw, startedRaw] = await AsyncStorage.multiGet([
    SESSION_EVENT_COUNT_KEY,
    SESSION_STARTED_AT_KEY,
  ]);
  const events = Math.max(0, parseInt(eventsRaw?.[1] ?? '0', 10));
  const startedAtMs = Math.max(0, parseInt(startedRaw?.[1] ?? '0', 10));
  if (!startedAtMs) return null;
  return { events, startedAtMs };
}

export function summarizeEventForLogging(ev: TelemetryEvent): void {
  // Intentionally minimal; keeps a single debug line and avoids noisy payloads.
  // eslint-disable-next-line no-console
  console.debug('[ads.telemetry]', ev.kind, ev.screen, ev.format ?? '-', ev.network ?? '-');
}

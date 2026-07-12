/**
 * Optional PostHog product analytics (HTTP capture — no native SDK required).
 * No-op when EXPO_PUBLIC_POSTHOG_API_KEY is unset or privacy consent denies analytics.
 */
import { Platform } from 'react-native';
import { ANALYTICS_EVENTS, type AnalyticsEventName } from '../constants/analyticsEvents';
import {
  getAnalyticsDistinctId,
  resetAnalyticsDistinctId,
  setAnalyticsDistinctId,
} from '../utils/analyticsDistinctId';
import { canSendAnalytics } from '../utils/privacyPreferences';

const POSTHOG_KEY =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim() : '';
const POSTHOG_HOST = (
  (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() : '') ||
  'https://us.i.posthog.com'
).replace(/\/$/, '');

export function isProductAnalyticsEnabled(): boolean {
  return Boolean(POSTHOG_KEY);
}

async function posthogCapture(
  event: string,
  properties?: Record<string, unknown>,
  distinctId?: string,
): Promise<void> {
  if (!POSTHOG_KEY) return;
  if (!(await canSendAnalytics())) return;
  const id = distinctId ?? (await getAnalyticsDistinctId());
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: id,
        properties: {
          platform: Platform.OS,
          $lib: 'octobetiq-mobile',
          ...properties,
        },
      }),
    });
  } catch {
    /* non-blocking */
  }
}

export async function trackEvent(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): Promise<void> {
  await posthogCapture(event, properties);
}

export async function trackScreenView(screenName: string): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.SCREEN_VIEWED, { screen: screenName });
}

export async function trackAppOpened(): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.APP_OPENED);
}

export async function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean | null | undefined>,
): Promise<void> {
  if (!POSTHOG_KEY || !userId) return;
  if (!(await canSendAnalytics())) return;
  const anonId = await getAnalyticsDistinctId();
  if (anonId !== userId) {
    await posthogCapture(
      '$create_alias',
      { alias: userId },
      anonId,
    );
  }
  await setAnalyticsDistinctId(userId);
  const setProps = Object.fromEntries(
    Object.entries(traits ?? {}).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(setProps).length > 0) {
    await posthogCapture('$identify', { $set: setProps }, userId);
  }
}

export async function resetAnalyticsIdentity(): Promise<void> {
  await resetAnalyticsDistinctId();
}

export async function trackSignInCompleted(
  method: 'email' | 'apple' | 'password_reset',
  userId?: string,
  subscriptionTier?: string,
): Promise<void> {
  if (userId) {
    await identifyUser(userId, { subscription_tier: subscriptionTier });
  }
  await trackEvent(ANALYTICS_EVENTS.SIGN_IN_COMPLETED, { method });
}

export async function trackSignUpCompleted(userId?: string): Promise<void> {
  if (userId) {
    await identifyUser(userId, { subscription_tier: 'free' });
  }
  await trackEvent(ANALYTICS_EVENTS.SIGN_UP_COMPLETED);
}

export async function trackOnboardingCompleted(pushOptIn: boolean): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, { push_opt_in: pushOptIn });
}

export async function trackFavouriteSelected(
  leagueCount: number,
  source: 'onboarding' | 'favorites',
): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.FAVOURITE_SELECTED, {
    league_count: leagueCount,
    source,
  });
}

export async function trackFirstPredictionOpened(
  gameId: string,
  audience: 'guest' | 'auth',
  source: 'onboarding' | 'home_banner' | 'home_feed',
): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.FIRST_PREDICTION_OPENED, {
    game_id: gameId,
    audience,
    source,
  });
}

export async function trackScorecardOpened(
  source: 'onboarding_nudge' | 'home' | 'profile' | 'help' | 'other',
): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.SCORECARD_OPENED, { source });
}

export async function trackActivationCompleted(): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.ACTIVATION_COMPLETED);
}

export async function trackSubscriptionActivated(
  tier: string,
  source: 'iap' | 'restore' | 'stripe',
): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED, { tier, source });
}

export async function trackSharePick(gameId: string): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.SHARE_PICK, { game_id: gameId });
}

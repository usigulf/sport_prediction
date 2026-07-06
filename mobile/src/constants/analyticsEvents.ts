/** Canonical product analytics event names (PostHog / funnel). */
export const ANALYTICS_EVENTS = {
  APP_OPENED: 'app_opened',
  SCREEN_VIEWED: 'screen_viewed',
  SIGN_IN_COMPLETED: 'sign_in_completed',
  SIGN_UP_COMPLETED: 'sign_up_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  SHARE_PICK: 'share_pick',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

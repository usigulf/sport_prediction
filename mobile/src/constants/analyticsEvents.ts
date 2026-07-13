/** Canonical product analytics event names (PostHog / funnel). */
export const ANALYTICS_EVENTS = {
  APP_OPENED: 'app_opened',
  SCREEN_VIEWED: 'screen_viewed',
  SIGN_IN_COMPLETED: 'sign_in_completed',
  SIGN_UP_COMPLETED: 'sign_up_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FAVOURITE_SELECTED: 'favourite_selected',
  FIRST_PREDICTION_OPENED: 'first_prediction_opened',
  SCORECARD_OPENED: 'scorecard_opened',
  ACTIVATION_COMPLETED: 'activation_completed',
  PAYWALL_VIEWED: 'paywall_viewed',
  PAYWALL_CTA_TAPPED: 'paywall_cta_tapped',
  PAYWALL_EXPERIMENT_VIEWED: 'paywall_experiment_viewed',
  TRIAL_STARTED: 'trial_started',
  TRIAL_CONVERTED: 'trial_converted',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SHARE_PICK: 'share_pick',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

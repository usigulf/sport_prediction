/**
 * Privacy preferences — gates PostHog + ad SDK until the user chooses (audit #7).
 * Defaults: no analytics / no ad SDK until consentCompleted.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@octobetiq_privacy_preferences_v1';

export type PrivacyPreferences = {
  /** User finished the privacy choices screen at least once. */
  consentCompleted: boolean;
  /** Product analytics (PostHog). Off until explicitly enabled. */
  analyticsEnabled: boolean;
  /** Ad measurement / personalized advertising signals. Off until enabled. */
  adsMeasurementEnabled: boolean;
  /** Local CCPA do-not-sell/share preference. */
  ccpaOptOut: boolean;
  updatedAtIso: string | null;
};

const DEFAULTS: PrivacyPreferences = {
  consentCompleted: false,
  analyticsEnabled: false,
  adsMeasurementEnabled: false,
  ccpaOptOut: false,
  updatedAtIso: null,
};

export async function getPrivacyPreferences(): Promise<PrivacyPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<PrivacyPreferences>;
    return {
      consentCompleted: Boolean(parsed.consentCompleted),
      analyticsEnabled: Boolean(parsed.analyticsEnabled),
      adsMeasurementEnabled: Boolean(parsed.adsMeasurementEnabled),
      ccpaOptOut: Boolean(parsed.ccpaOptOut),
      updatedAtIso: typeof parsed.updatedAtIso === 'string' ? parsed.updatedAtIso : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setPrivacyPreferences(
  patch: Partial<Omit<PrivacyPreferences, 'updatedAtIso'>>,
): Promise<PrivacyPreferences> {
  const current = await getPrivacyPreferences();
  const next: PrivacyPreferences = {
    ...current,
    ...patch,
    updatedAtIso: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function completePrivacyConsent(input: {
  analyticsEnabled: boolean;
  adsMeasurementEnabled: boolean;
}): Promise<PrivacyPreferences> {
  return setPrivacyPreferences({
    consentCompleted: true,
    analyticsEnabled: input.analyticsEnabled,
    adsMeasurementEnabled: input.adsMeasurementEnabled,
    // Enabling analytics clears a prior CCPA opt-out locally; Settings can re-apply.
    ccpaOptOut: input.analyticsEnabled ? false : true,
  });
}

/** True when PostHog may send events. */
export async function canSendAnalytics(): Promise<boolean> {
  const p = await getPrivacyPreferences();
  return p.consentCompleted && p.analyticsEnabled && !p.ccpaOptOut;
}

/** True when AdMob SDK may initialize (after consent screen). */
export async function canInitializeAdsSdk(): Promise<boolean> {
  const p = await getPrivacyPreferences();
  return p.consentCompleted;
}

/** True when ad impression telemetry may leave the device. */
export async function canSendAdsTelemetry(): Promise<boolean> {
  const p = await getPrivacyPreferences();
  return p.consentCompleted && p.adsMeasurementEnabled && !p.ccpaOptOut;
}

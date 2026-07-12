import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  canSendAdsTelemetry,
  canSendAnalytics,
  completePrivacyConsent,
  getPrivacyPreferences,
  setPrivacyPreferences,
} from './privacyPreferences';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('privacyPreferences', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to no consent and blocks analytics', async () => {
    const prefs = await getPrivacyPreferences();
    expect(prefs.consentCompleted).toBe(false);
    expect(await canSendAnalytics()).toBe(false);
    expect(await canSendAdsTelemetry()).toBe(false);
  });

  it('allows analytics only after explicit grant', async () => {
    await completePrivacyConsent({ analyticsEnabled: true, adsMeasurementEnabled: false });
    expect(await canSendAnalytics()).toBe(true);
    expect(await canSendAdsTelemetry()).toBe(false);
  });

  it('ccpa opt-out blocks analytics and ad telemetry', async () => {
    await completePrivacyConsent({ analyticsEnabled: true, adsMeasurementEnabled: true });
    await setPrivacyPreferences({ ccpaOptOut: true, analyticsEnabled: false });
    expect(await canSendAnalytics()).toBe(false);
    expect(await canSendAdsTelemetry()).toBe(false);
  });
});

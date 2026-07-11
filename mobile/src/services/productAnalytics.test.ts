jest.mock('../utils/analyticsDistinctId', () => ({
  getAnalyticsDistinctId: jest.fn(async () => 'anon-test'),
  setAnalyticsDistinctId: jest.fn(async () => undefined),
  resetAnalyticsDistinctId: jest.fn(async () => undefined),
}));

describe('productAnalytics', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('is disabled without PostHog key', () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isProductAnalyticsEnabled } = require('../services/productAnalytics');
    expect(isProductAnalyticsEnabled()).toBe(false);
  });

  it('is enabled when PostHog key is set', () => {
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY = 'phc_test_key';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isProductAnalyticsEnabled } = require('../services/productAnalytics');
    expect(isProductAnalyticsEnabled()).toBe(true);
  });
});

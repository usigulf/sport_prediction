import { clearServerFeatureFlagsCache, fetchServerFeatureFlags } from '../hooks/useServerFeatureFlags';

jest.mock('../services/api', () => ({
  getApiOrigin: () => 'https://api.test',
}));

describe('fetchServerFeatureFlags', () => {
  beforeEach(() => {
    clearServerFeatureFlagsCache();
    global.fetch = jest.fn();
  });

  it('parses flags from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        flags: {
          odds_display: true,
          experiments: { trial_length_days: 7 },
        },
      }),
    });
    const flags = await fetchServerFeatureFlags();
    expect(flags.odds_display).toBe(true);
    expect(flags.experiments?.trial_length_days).toBe(7);
  });
});

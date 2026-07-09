import { getAgeGateConfirmed, setAgeGateConfirmed } from './ageGateStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');

describe('ageGateStorage', () => {
  beforeEach(() => {
    AsyncStorage.getItem.mockReset();
    AsyncStorage.setItem.mockReset();
  });

  it('returns false when not confirmed', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    expect(await getAgeGateConfirmed()).toBe(false);
  });

  it('returns true when confirmed', async () => {
    AsyncStorage.getItem.mockResolvedValue('true');
    expect(await getAgeGateConfirmed()).toBe(true);
  });

  it('persists confirmation', async () => {
    await setAgeGateConfirmed();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@sport_prediction_age_gate_confirmed',
      'true',
    );
  });
});

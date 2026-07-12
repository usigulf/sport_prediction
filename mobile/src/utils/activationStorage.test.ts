import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActivationComplete,
  getScorecardNudgePending,
  markActivationComplete,
  setPendingFirstPrediction,
  setScorecardNudgePending,
  consumePendingFirstPrediction,
} from './activationStorage';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      getItem: jest.fn(async (k: string) => store[k] ?? null),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
      multiSet: jest.fn(async (pairs: [string, string][]) => {
        for (const [k, v] of pairs) store[k] = v;
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});

describe('activationStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores and consumes pending first prediction', async () => {
    await setPendingFirstPrediction('game-1');
    expect(await consumePendingFirstPrediction()).toBe('game-1');
    expect(await consumePendingFirstPrediction()).toBeNull();
  });

  it('tracks scorecard nudge and activation complete', async () => {
    await setScorecardNudgePending(true);
    expect(await getScorecardNudgePending()).toBe(true);
    await markActivationComplete();
    expect(await getScorecardNudgePending()).toBe(false);
    expect(await getActivationComplete()).toBe(true);
  });
});

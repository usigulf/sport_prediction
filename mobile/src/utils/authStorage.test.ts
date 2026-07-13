import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from './authStorage';

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
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

describe('authStorage', () => {
  const auth = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    email: 'fan@example.com',
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  });

  it('persists auth in SecureStore on native', async () => {
    await setStoredAuth(auth);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      '@sport_prediction_auth',
      JSON.stringify(auth),
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@sport_prediction_auth');
  });

  it('reads auth from SecureStore on native', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(auth));
    await expect(getStoredAuth()).resolves.toEqual(auth);
  });

  it('clears SecureStore and AsyncStorage on sign-out', async () => {
    await clearStoredAuth();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('@sport_prediction_auth');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@sport_prediction_auth');
  });

  it('uses AsyncStorage on web', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    await setStoredAuth(auth);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@sport_prediction_auth',
      JSON.stringify(auth),
    );
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});

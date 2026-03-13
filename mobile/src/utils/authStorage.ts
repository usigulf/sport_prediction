/**
 * Persist auth token and email so user stays logged in across app restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = '@sport_prediction_auth';

export interface StoredAuth {
  accessToken: string;
  refreshToken?: string;
  email: string;
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredAuth;
    if (!data.accessToken || !data.email) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setStoredAuth(auth: StoredAuth): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export async function clearStoredAuth(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

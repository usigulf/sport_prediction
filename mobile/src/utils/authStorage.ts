/**
 * Persist auth token and email so user stays logged in across app restarts.
 * Native: expo-secure-store (Keychain/Keystore). Web: AsyncStorage fallback.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_KEY = '@sport_prediction_auth';

export interface StoredAuth {
  accessToken: string;
  refreshToken?: string;
  email: string;
}

async function readRaw(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(AUTH_KEY);
  }
  return SecureStore.getItemAsync(AUTH_KEY);
}

async function writeRaw(raw: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(AUTH_KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(AUTH_KEY, raw);
}

async function removeAll(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(AUTH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_KEY);
}

/** Migrate legacy AsyncStorage blob to Secure Store once (native only). */
async function migrateLegacyFromAsyncStorage(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const legacy = await AsyncStorage.getItem(AUTH_KEY);
    if (!legacy) return;
    const hasSecure = await SecureStore.getItemAsync(AUTH_KEY);
    if (!hasSecure) {
      await SecureStore.setItemAsync(AUTH_KEY, legacy);
    }
    await AsyncStorage.removeItem(AUTH_KEY);
  } catch {
    /* migration best-effort */
  }
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  try {
    await migrateLegacyFromAsyncStorage();
    const raw = await readRaw();
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredAuth;
    if (!data.accessToken || !data.email) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setStoredAuth(auth: StoredAuth): Promise<void> {
  const raw = JSON.stringify(auth);
  await writeRaw(raw);
  if (Platform.OS !== 'web') {
    await AsyncStorage.removeItem(AUTH_KEY);
  }
}

export async function clearStoredAuth(): Promise<void> {
  await removeAll();
  await AsyncStorage.removeItem(AUTH_KEY);
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const DISTINCT_ID_KEY = '@octobetiq_analytics_distinct_id';

function randomDistinctId(): string {
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getAnalyticsDistinctId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DISTINCT_ID_KEY);
    if (existing) return existing;
    const created = randomDistinctId();
    await AsyncStorage.setItem(DISTINCT_ID_KEY, created);
    return created;
  } catch {
    return randomDistinctId();
  }
}

export async function setAnalyticsDistinctId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DISTINCT_ID_KEY, id);
  } catch {
    /* non-blocking */
  }
}

export async function resetAnalyticsDistinctId(): Promise<string> {
  const created = randomDistinctId();
  try {
    await AsyncStorage.setItem(DISTINCT_ID_KEY, created);
  } catch {
    /* non-blocking */
  }
  return created;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Game } from '../types';

const CACHE_PREFIX = '@sport_prediction_games_rq_v1:';

export type GamesCachePayload = {
  games: Game[];
  updatedAt: string;
};

export function gamesCacheStorageKey(queryKey: readonly unknown[]): string {
  return CACHE_PREFIX + JSON.stringify(queryKey);
}

export async function readGamesCache(
  queryKey: readonly unknown[],
): Promise<GamesCachePayload | null> {
  try {
    const raw = await AsyncStorage.getItem(gamesCacheStorageKey(queryKey));
    if (!raw) return null;
    const data = JSON.parse(raw) as GamesCachePayload;
    if (!data.games || !Array.isArray(data.games) || !data.updatedAt) return null;
    return data;
  } catch {
    return null;
  }
}

export async function writeGamesCache(
  queryKey: readonly unknown[],
  payload: GamesCachePayload,
): Promise<void> {
  try {
    await AsyncStorage.setItem(gamesCacheStorageKey(queryKey), JSON.stringify(payload));
  } catch {
    /* non-blocking */
  }
}

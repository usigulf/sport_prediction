import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@octobetiQ/reward_analysis_unlock_map_v1';

type ExpiryMap = Record<string, number>;

type Ctx = {
  /** True when premium subscription should bypass ads unlock (handled by callers). */
  isUnlockedForGame: (gameId: string) => boolean;
  grantUnlockForMinutes: (gameId: string, minutes: number) => Promise<void>;
  invalidateForGame: (gameId: string) => Promise<void>;
  unlockedUntilMs: (gameId: string) => number | null;
};

const RewardedUnlockContext = createContext<Ctx | null>(null);

async function loadMap(): Promise<ExpiryMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as ExpiryMap;
    return typeof o === 'object' && o ? o : {};
  } catch {
    return {};
  }
}

async function saveMap(map: ExpiryMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function pruneExpired(map: ExpiryMap): ExpiryMap {
  const now = Date.now();
  const next: ExpiryMap = {};
  Object.entries(map).forEach(([k, v]) => {
    if (typeof v === 'number' && v > now) next[k] = v;
  });
  return next;
}

export const RewardedUnlockProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [map, setMap] = useState<ExpiryMap>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      const m = pruneExpired(await loadMap());
      await saveMap(m);
      if (!cancel) setMap(m);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const applyMap = useCallback(async (updater: (m: ExpiryMap) => ExpiryMap) => {
    const m = updater(pruneExpired({ ...map }));
    setMap(m);
    await saveMap(m);
  }, [map]);

  const isUnlockedForGame = useCallback(
    (gameId: string) => {
      const until = map[gameId];
      return typeof until === 'number' && until > Date.now();
    },
    [map],
  );

  const unlockedUntilMs = useCallback(
    (gameId: string) => {
      const until = map[gameId];
      return typeof until === 'number' && until > Date.now() ? until : null;
    },
    [map],
  );

  const grantUnlockForMinutes = useCallback(
    async (gameId: string, minutes: number) => {
      const until = Date.now() + Math.max(1, minutes) * 60_000;
      await applyMap((m) => ({ ...m, [gameId]: until }));
    },
    [applyMap],
  );

  const invalidateForGame = useCallback(async (gameId: string) => {
    await applyMap((m) => {
      const n = { ...m };
      delete n[gameId];
      return n;
    });
  }, [applyMap]);

  const value = useMemo<Ctx>(
    () => ({
      isUnlockedForGame,
      grantUnlockForMinutes,
      invalidateForGame,
      unlockedUntilMs,
    }),
    [
      grantUnlockForMinutes,
      invalidateForGame,
      isUnlockedForGame,
      unlockedUntilMs,
    ],
  );

  return (
    <RewardedUnlockContext.Provider value={value}>
      {children}
    </RewardedUnlockContext.Provider>
  );
};

export function useRewardedUnlock(): Ctx {
  const ctx = useContext(RewardedUnlockContext);
  if (!ctx)
    throw new Error('useRewardedUnlock must be used inside RewardedUnlockProvider');
  return ctx;
}

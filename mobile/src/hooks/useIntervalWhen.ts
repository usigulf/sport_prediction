import { useEffect, useRef } from 'react';

/** Run callback on an interval while `enabled` is true. */
export function useIntervalWhen(
  enabled: boolean,
  intervalMs: number,
  callback: () => void,
): void {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    const id = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}

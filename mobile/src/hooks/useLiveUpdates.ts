/**
 * Hook to subscribe to live game updates via WebSocket.
 * Connects to WS /ws/live/{gameId} (same host as API, ws/wss scheme).
 * Requires JWT in query for auth; premium tier required on backend.
 */
import { useEffect, useState, useRef } from 'react';
import { buildLiveWebSocketUrl, subscribeApiOriginChanged } from '../services/api';
import { useAppSelector } from '../store/hooks';

export interface LiveUpdateMessage {
  type: string;
  game_id: string;
  home_score: number;
  away_score: number;
  home_win_probability: number;
  away_win_probability: number;
  confidence_level: string | null;
  /** ISO timestamp of latest prediction row when server sends it */
  prediction_updated_at?: string | null;
}

export function useLiveUpdates(
  gameId: string | undefined,
  options: { enabled?: boolean } = {}
): {
  lastUpdate: LiveUpdateMessage | null;
  connected: boolean;
  error: string | null;
} {
  const { enabled = true } = options;
  const accessToken = useAppSelector((s) => s.auth.user?.token ?? null);
  const [lastUpdate, setLastUpdate] = useState<LiveUpdateMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiOriginTick, setApiOriginTick] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return subscribeApiOriginChanged(() => {
      setApiOriginTick((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    if (!gameId || !enabled) {
      setLastUpdate(null);
      setConnected(false);
      setError(null);
      return;
    }
    if (!accessToken) {
      setError('Sign in required for live updates');
      setConnected(false);
      return;
    }
    const wsUrl = buildLiveWebSocketUrl(gameId, accessToken);

    setError(null);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.error) {
          setError(data.error);
          return;
        }
        if (data.type === 'update') {
          setLastUpdate({
            type: data.type,
            game_id: data.game_id,
            home_score: data.home_score ?? 0,
            away_score: data.away_score ?? 0,
            home_win_probability: data.home_win_probability ?? 0.5,
            away_win_probability: data.away_win_probability ?? 0.5,
            confidence_level: data.confidence_level ?? null,
            prediction_updated_at: data.prediction_updated_at ?? null,
          });
          setError(null);
        }
      } catch {
        setError('Invalid update');
      }
    };

    ws.onerror = () => {
      setError('Live updates: connection failed (server must proxy WebSockets for /ws)');
    };

    ws.onclose = (ev) => {
      setConnected(false);
      wsRef.current = null;
      if (ev.code === 1008 && ev.reason) {
        setError(ev.reason);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      setLastUpdate(null);
    };
  }, [gameId, enabled, accessToken, apiOriginTick]);

  return { lastUpdate, connected, error };
}

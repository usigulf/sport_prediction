/**
 * Hook to subscribe to live game updates via WebSocket.
 * Connects to WS /ws/live/{gameId} (same host as API, ws/wss scheme).
 * Requires JWT in query for auth; premium tier required on backend.
 */
import { useEffect, useState, useRef } from 'react';
import { getApiOrigin, getAuthToken } from '../services/api';

export interface LiveUpdateMessage {
  type: string;
  game_id: string;
  home_score: number;
  away_score: number;
  home_win_probability: number;
  away_win_probability: number;
  confidence_level: string | null;
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
  const [lastUpdate, setLastUpdate] = useState<LiveUpdateMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!gameId || !enabled) {
      setLastUpdate(null);
      setConnected(false);
      setError(null);
      return;
    }
    const origin = getApiOrigin();
    const wsScheme = origin.startsWith('https') ? 'wss' : 'ws';
    const wsHost = origin.replace(/^https?:\/\//, '');
    const token = getAuthToken();
    const wsUrl = `${wsScheme}://${wsHost}/ws/live/${gameId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

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
          });
          setError(null);
        }
      } catch {
        setError('Invalid update');
      }
    };

    ws.onerror = () => {
      setError('Connection error');
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      setLastUpdate(null);
    };
  }, [gameId, enabled]);

  return { lastUpdate, connected, error };
}

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import type { LivePrediction } from '@/types/predictions';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.sportoracle.com/ws';

type MessageHandler = (data: unknown) => void;

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (gameId: string) => void;
  unsubscribe: (gameId: string) => void;
  onLivePrediction: (handler: (prediction: LivePrediction) => void) => () => void;
  onLineMovement: (handler: (data: LineMovementEvent) => void) => () => void;
}

interface LineMovementEvent {
  gameId: string;
  sport: string;
  previousLine: number;
  currentLine: number;
  direction: 'up' | 'down';
  timestamp: string;
}

interface WebSocketMessage {
  type: 'live_prediction' | 'line_movement' | 'game_start' | 'injury_update' | 'pong';
  data: unknown;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  subscribe: () => {},
  unsubscribe: () => {},
  onLivePrediction: () => () => {},
  onLineMovement: () => () => {},
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedGames = useRef<Set<string>>(new Set());
  const livePredictionHandlers = useRef<Set<(prediction: LivePrediction) => void>>(new Set());
  const lineMovementHandlers = useRef<Set<(data: LineMovementEvent) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const { isAuthenticated } = useAuthStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');

        // Re-subscribe to previously subscribed games
        subscribedGames.current.forEach((gameId) => {
          wsRef.current?.send(JSON.stringify({ type: 'subscribe', gameId }));
        });

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'live_prediction':
              livePredictionHandlers.current.forEach((handler) => {
                handler(message.data as LivePrediction);
              });
              break;
            case 'line_movement':
              lineMovementHandlers.current.forEach((handler) => {
                handler(message.data as LineMovementEvent);
              });
              break;
            case 'pong':
              // Keep-alive acknowledged
              break;
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Attempt reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        connect();
      } else if (nextAppState === 'background') {
        disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial connection if authenticated
    if (isAuthenticated) {
      connect();
    }

    return () => {
      subscription.remove();
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  const subscribe = useCallback((gameId: string) => {
    subscribedGames.current.add(gameId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', gameId }));
    }
  }, []);

  const unsubscribe = useCallback((gameId: string) => {
    subscribedGames.current.delete(gameId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', gameId }));
    }
  }, []);

  const onLivePrediction = useCallback((handler: (prediction: LivePrediction) => void) => {
    livePredictionHandlers.current.add(handler);
    return () => {
      livePredictionHandlers.current.delete(handler);
    };
  }, []);

  const onLineMovement = useCallback((handler: (data: LineMovementEvent) => void) => {
    lineMovementHandlers.current.add(handler);
    return () => {
      lineMovementHandlers.current.delete(handler);
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        subscribe,
        unsubscribe,
        onLivePrediction,
        onLineMovement,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

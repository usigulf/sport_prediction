/**
 * WebSocket Service for Live Game Updates
 * Handles real-time prediction updates during live games
 */

interface WebSocketCallbacks {
  onPredictionUpdate?: (data: any) => void;
  onScoreUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private gameId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private callbacks: WebSocketCallbacks = {};
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private getAuthToken(): string | null {
    // Get token from AsyncStorage or Redux store
    return null;
  }

  private getWebSocketUrl(gameId: string): string {
    const baseUrl = __DEV__
      ? 'ws://localhost:8000'
      : 'wss://api.sportsprediction.com';
    const token = this.getAuthToken();
    return `${baseUrl}/ws/live/${gameId}${token ? `?token=${token}` : ''}`;
  }

  connect(gameId: string, callbacks: WebSocketCallbacks = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.gameId === gameId) {
        // Already connected to this game
        return;
      }
      this.disconnect();
    }

    this.gameId = gameId;
    this.callbacks = callbacks;
    this.reconnectAttempts = 0;

    this.attemptConnection();
  }

  private attemptConnection() {
    if (!this.gameId) return;

    try {
      const url = this.getWebSocketUrl(this.gameId);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.callbacks.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ping') {
            // Respond to heartbeat
            this.ws?.send(JSON.stringify({ type: 'pong' }));
            return;
          }

          switch (data.type) {
            case 'prediction_update':
              this.callbacks.onPredictionUpdate?.(data.data);
              break;
            case 'score_update':
              this.callbacks.onScoreUpdate?.(data.data);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onError?.(error as unknown as Error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        this.callbacks.onDisconnect?.();

        // Attempt to reconnect
        if (
          this.reconnectAttempts < this.maxReconnectAttempts &&
          this.gameId
        ) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.attemptConnection();
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.gameId = null;
    this.callbacks = {};
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();

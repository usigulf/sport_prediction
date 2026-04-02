/**
 * API Service for Sports Prediction App
 * Handles all HTTP requests to the backend API
 */
import { Platform } from 'react-native';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../utils/authStorage';

// In dev: Android emulator uses 10.0.2.2 for host; iOS simulator uses localhost.
// For a physical device, set EXPO_PUBLIC_API_URL to your machine's LAN IP (e.g. http://192.168.1.100:8000/api/v1)
const getApiBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:8000/api/v1'
      : 'http://localhost:8000/api/v1';
  }
  return 'https://api.octobetiq.com/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// In dev, we may override this when we discover backend on the other port (8000/8001)
let effectiveBaseUrl: string = API_BASE_URL;

const _apiOriginListeners = new Set<() => void>();

/** Fired when effectiveBaseUrl changes (e.g. alternate port detected). Use to reconnect WebSockets. */
export function subscribeApiOriginChanged(cb: () => void): () => void {
  _apiOriginListeners.add(cb);
  return () => {
    _apiOriginListeners.delete(cb);
  };
}

function _notifyApiOriginChanged(): void {
  _apiOriginListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore subscriber errors */
    }
  });
}

function getOriginFromBase(base: string): string {
  return base.replace(/\/api\/v1\/?$/, '') || 'http://localhost:8000';
}

/** Alternate port (8000 <-> 8001) to auto-detect backend. Works for localhost and LAN IP. */
function getAlternateBaseUrl(): string | null {
  if (typeof __DEV__ === 'boolean' && !__DEV__) return null;
  const origin = getOriginFromBase(effectiveBaseUrl);
  const match = origin.match(/:(\d+)$/);
  const port = match ? parseInt(match[1], 10) : 8000;
  const other = port === 8000 ? 8001 : 8000;
  return `${origin.replace(/:(\d+)$/, '')}:${other}/api/v1`;
}

/** Base URL without /api/v1 (e.g. http://localhost:8001) */
export function getApiOrigin(): string {
  return getOriginFromBase(effectiveBaseUrl);
}

/**
 * WebSocket origin (ws:// or wss://) for /ws/live/... — same host/port as getApiOrigin() after health checks.
 * Override with EXPO_PUBLIC_WS_URL if a reverse proxy serves WS on a different host (rare).
 */
export function getWebSocketOrigin(): string {
  const raw =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_WS_URL?.trim() : '';
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  const origin = getApiOrigin();
  if (origin.startsWith('https://')) {
    return `wss://${origin.slice('https://'.length)}`;
  }
  if (origin.startsWith('http://')) {
    return `ws://${origin.slice('http://'.length)}`;
  }
  return origin;
}

/** Full URL for authenticated live game WebSocket. */
export function buildLiveWebSocketUrl(gameId: string, accessToken: string): string {
  const base = getWebSocketOrigin();
  return `${base}/ws/live/${gameId}?token=${encodeURIComponent(accessToken)}`;
}

// Token is set on login and cleared on logout. For persistence across app restarts, use AsyncStorage (P1).
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Called when the server returns 401 (e.g. session expired). Set from App to dispatch logout. */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null): void {
  onUnauthorized = cb;
}

/** After silent refresh, Redux (and WebSocket URLs) must see the new access token. Wired from App. */
let onAccessTokenRefreshed: ((p: { accessToken: string; email: string }) => void) | null = null;
export function setOnAccessTokenRefreshed(
  cb: ((p: { accessToken: string; email: string }) => void) | null
): void {
  onAccessTokenRefreshed = cb;
}

function fetchHealth(origin: string, signal?: AbortSignal): Promise<boolean> {
  return fetch(`${origin}/health`, { method: 'GET', signal })
    .then((r) => r.ok)
    .catch(() => false);
}

/** Ping backend /health. Tries configured origin then alternate port (8000/8001). Sets effectiveBaseUrl if alternate works. */
export async function checkBackendHealth(): Promise<{ ok: boolean; url: string }> {
  const origin = getOriginFromBase(effectiveBaseUrl);
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 4000);
  try {
    let ok = await fetchHealth(origin, c.signal);
    if (!ok && getAlternateBaseUrl()) {
      const alt = getAlternateBaseUrl()!;
      const altOrigin = getOriginFromBase(alt);
      const altOk = await fetchHealth(altOrigin, c.signal);
      if (altOk) {
        effectiveBaseUrl = alt;
        _notifyApiOriginChanged();
        ok = true;
      }
    }
    clearTimeout(t);
    return { ok, url: getOriginFromBase(effectiveBaseUrl) };
  } catch {
    clearTimeout(t);
    return { ok: false, url: origin };
  }
}

const REQUEST_TIMEOUT_MS = 15000; // 15 seconds

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  requireAuth?: boolean;
  /** Send Bearer token if present (for optional auth: backend returns user-specific data e.g. predictions for premium). */
  sendAuthIfPresent?: boolean;
  /** When aborted (e.g. league change), request is cancelled; AbortError is not logged. */
  signal?: AbortSignal;
}

/** Raw refresh (no auth header). Returns new tokens or throws. */
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const url = `${effectiveBaseUrl}/auth/refresh`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const err = new Error('Refresh failed') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

class ApiService {
  private getStoredToken(): string | null {
    return authToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    isRetryAfterRefresh = false
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      requireAuth = false,
      sendAuthIfPresent = false,
      signal: externalSignal,
    } = options;

    const url = `${effectiveBaseUrl}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const token = this.getStoredToken();
    if (requireAuth || sendAuthIfPresent) {
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new Error('Request was aborted');
      }
      externalSignal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      });
    }

    const makeConfig = (signal: AbortSignal): RequestInit => ({
      method,
      headers: requestHeaders,
      signal,
      ...(body !== undefined
        ? {
            body:
              requestHeaders['Content-Type'] === 'application/x-www-form-urlencoded'
                ? (body as string)
                : JSON.stringify(body),
          }
        : {}),
    });

    const doFetch = async (baseUrl: string, signal: AbortSignal): Promise<T> => {
      const res = await fetch(`${baseUrl}${endpoint}`, makeConfig(signal));
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: `HTTP ${res.status}: ${res.statusText}` }));
        const message =
          typeof error.detail === 'string'
            ? error.detail || `Request failed (${res.status})`
            : Array.isArray(error.detail) && error.detail[0]?.msg
              ? error.detail[0].msg
              : `Request failed (${res.status})`;
        const err = new Error(message) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      return (await res.json()) as T;
    };

    try {
      const data = await doFetch(effectiveBaseUrl, controller.signal);
      clearTimeout(timeoutId);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.status === 401) {
        const isRefreshEndpoint = endpoint.startsWith('/auth/refresh');
        if (!isRetryAfterRefresh && !isRefreshEndpoint) {
          try {
            const stored = await getStoredAuth();
            const rt = stored?.refreshToken;
            if (rt) {
              const tokens = await refreshAccessToken(rt);
              setAuthToken(tokens.access_token);
              await setStoredAuth({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? rt,
                email: stored!.email,
              });
              onAccessTokenRefreshed?.({
                accessToken: tokens.access_token,
                email: stored!.email,
              });
              return this.request<T>(endpoint, options, true);
            }
          } catch {
            // refresh failed or no refresh token
          }
        }
        setAuthToken(null);
        clearStoredAuth().catch(() => {});
        onUnauthorized?.();
      }
      const errMsg = error?.message ?? String(error);
      const isNetworkError = errMsg.includes('Network request failed') || errMsg.includes('Failed to fetch');
      const alt = isNetworkError ? getAlternateBaseUrl() : null;
      if (alt) {
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), REQUEST_TIMEOUT_MS);
        try {
          const data = await doFetch(alt, c2.signal);
          clearTimeout(t2);
          effectiveBaseUrl = alt;
          _notifyApiOriginChanged();
          return data;
        } catch {
          clearTimeout(t2);
        }
      }
      if (error?.name !== 'AbortError') {
        const st = error?.status;
        console.error(
          `API Error [${method} ${endpoint}]${st != null ? ` HTTP ${st}` : ''} base=${effectiveBaseUrl}:`,
          error
        );
        if (__DEV__ && st === 503) {
          console.error(
            '503 usually means the backend DB connection failed (check server DATABASE_URL / Postgres).'
          );
        }
      }
      if (error?.name === 'AbortError') {
        const err = new Error('Request timed out. Start the backend: cd backend && ./run.sh') as Error & { name: string };
        err.name = 'AbortError';
        throw err;
      }
      if (isNetworkError) {
        throw new Error(
          `Cannot reach the API at ${getApiOrigin()}. Start the backend: cd backend && ./run.sh`
        );
      }
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    return this.request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
  }

  async register(email: string, password: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { email, password },
    });
  }

  // Games
  async getUpcomingGames(params?: {
    league?: string;
    leagues?: string;
    date?: string;
    skip?: number;
    limit?: number;
    signal?: AbortSignal;
  }) {
    const { signal, ...rest } = params ?? {};
    const queryParams = new URLSearchParams();
    if (rest.league) queryParams.append('league', rest.league);
    if (rest.leagues) queryParams.append('leagues', rest.leagues);
    if (rest.date) queryParams.append('date', rest.date);
    if (rest.skip != null) queryParams.append('skip', rest.skip.toString());
    if (rest.limit != null) queryParams.append('limit', rest.limit.toString());

    const query = queryParams.toString();
    return this.request<{
      games: any[];
      total: number;
      skip: number;
      limit: number;
    }>(`/games/upcoming${query ? `?${query}` : ''}`, {
      requireAuth: false,
      sendAuthIfPresent: true,
      signal,
    });
  }

  async getGame(gameId: string) {
    return this.request(`/games/${gameId}`, {
      requireAuth: false,
      sendAuthIfPresent: true,
    });
  }

  // Predictions
  async getPrediction(gameId: string) {
    return this.request(`/games/${gameId}/predictions`, {
      requireAuth: true,
    });
  }

  async getPredictionExplanation(gameId: string) {
    return this.request(`/games/${gameId}/explanation`, {
      requireAuth: true,
    });
  }

  async getLivePrediction(gameId: string) {
    return this.request(`/games/${gameId}/live-predictions`, {
      requireAuth: true,
    });
  }

  // Player Props
  async getPlayerProps(playerId: string, gameId: string) {
    return this.request(`/players/${playerId}/props?gameId=${gameId}`, {
      requireAuth: true,
    });
  }

  async getGamePlayerProps(gameId: string) {
    return this.request(`/games/${gameId}/player-props`, {
      requireAuth: true,
    });
  }

  // User
  async getCurrentUser() {
    return this.request('/user/me', {
      requireAuth: true,
    });
  }

  async getFavorites() {
    return this.request('/user/favorites', {
      requireAuth: true,
    });
  }

  async addFavoriteTeam(teamId: string) {
    return this.request(`/user/favorites/teams/${teamId}`, {
      method: 'POST',
      requireAuth: true,
    });
  }

  async removeFavoriteTeam(teamId: string) {
    return this.request(`/user/favorites/teams/${teamId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  }

  async addFavoriteLeague(leagueCode: string) {
    return this.request(`/user/favorites/leagues/${encodeURIComponent(leagueCode)}`, {
      method: 'POST',
      requireAuth: true,
    });
  }

  async removeFavoriteLeague(leagueCode: string) {
    return this.request(`/user/favorites/leagues/${encodeURIComponent(leagueCode)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  }

  async getPredictionHistory(params?: { skip?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request(`/user/prediction-history${query ? `?${query}` : ''}`, {
      requireAuth: true,
    });
  }

  async registerPushToken(token: string) {
    return this.request('/user/push-token', {
      method: 'POST',
      body: { token },
      requireAuth: true,
    });
  }

  async removePushToken(token?: string) {
    const q = token != null ? `?token=${encodeURIComponent(token)}` : '';
    return this.request(`/user/push-token${q}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  }

  /** Permanently delete account and all data (GDPR). Session invalid after this. */
  async deleteAccount() {
    return this.request('/user/me', {
      method: 'DELETE',
      requireAuth: true,
    });
  }

  // Stats (public)
  async getAccuracy() {
    return this.request<{
      total_games: number;
      correct: number;
      accuracy_pct: number;
      by_league: Record<string, { total: number; correct: number; accuracy_pct: number }>;
    }>('/stats/accuracy', { requireAuth: false });
  }

  // Feed (top picks)
  async getTopPicks(params?: { leagues?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.leagues) queryParams.append('leagues', params.leagues);
    if (params?.limit) queryParams.append('limit', String(params.limit ?? 20));
    const query = queryParams.toString();
    return this.request<{ picks: any[]; count: number }>(
      `/feed/top-picks${query ? `?${query}` : ''}`,
      { requireAuth: false }
    );
  }

  // Leaderboards
  async getLeaderboards(params?: { period?: 'weekly' | 'monthly' | 'all'; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.limit) queryParams.append('limit', String(params.limit ?? 50));
    const query = queryParams.toString();
    return this.request<{
      period: string;
      entries: Array<{
        rank: number;
        user_id: string;
        display_name: string;
        correct: number;
        total: number;
        accuracy_pct: number;
        is_me?: boolean;
      }>;
      count: number;
    }>(`/leaderboards${query ? `?${query}` : ''}`, { requireAuth: false });
  }

  // Challenges (stub)
  async getChallenges(params?: { status?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', String(params.limit ?? 20));
    const query = queryParams.toString();
    return this.request<{ challenges: any[]; count: number }>(
      `/challenges${query ? `?${query}` : ''}`,
      { requireAuth: true }
    );
  }

  async getChallenge(id: string) {
    return this.request<{
      id: string;
      creator_id: string;
      game_ids: string[];
      status: string;
      correct_count: number;
      total_count: number;
      created_at: string | null;
      completed_at: string | null;
    }>(`/challenges/${id}`, { requireAuth: true });
  }

  async createChallenge(gameIds: string[]) {
    return this.request<{
      id: string;
      creator_id: string;
      game_ids: string[];
      status: string;
      correct_count: number;
      total_count: number;
      created_at: string | null;
      completed_at: string | null;
    }>('/challenges', {
      method: 'POST',
      body: { game_ids: gameIds },
      requireAuth: true,
    });
  }

  // Subscription (Stripe Checkout). Returns { url } to open in browser.
  async createCheckoutSession() {
    return this.request<{ url: string }>('/subscription/create-checkout', {
      method: 'POST',
      requireAuth: true,
    });
  }

  // Share pick (returns message + optional image_base64 PNG for share graphic)
  async sharePick(gameId: string) {
    return this.request<{ share_url: string | null; message: string; image_base64?: string | null }>(
      `/games/${encodeURIComponent(gameId)}/share`,
      { method: 'POST', requireAuth: false }
    );
  }
}

export const apiService = new ApiService();

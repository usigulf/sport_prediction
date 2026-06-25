/**
 * API Service for Sports Prediction App
 * Handles all HTTP requests to the backend API
 */
import { Platform } from 'react-native';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../utils/authStorage';
import type { User, Game, TopPick, ChallengeSummary } from '../types';

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

/** Base URL path for live game WebSocket (no credentials in URL). Auth via Authorization header at connect time. */
export function buildLiveWebSocketUrl(gameId: string): string {
  const base = getWebSocketOrigin();
  return `${base}/ws/live/${gameId}`;
}

// Token is set on login and cleared on logout. Persistence: SecureStore (native) / AsyncStorage (web); see authStorage.
let authToken: string | null = null;
/** Bumped whenever a new access token is installed — stale 401s / signOut must not clobber a newer session. */
let authSessionGeneration = 0;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    authSessionGeneration += 1;
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function getAuthSessionGeneration(): number {
  return authSessionGeneration;
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

export interface AccuracyBucket {
  total: number;
  correct: number;
  accuracy_pct: number;
}

export interface AccuracyMethodology {
  short: string;
  detail: string;
}

export interface AccuracyRollingWindow extends AccuracyBucket {
  by_league: Record<string, AccuracyBucket>;
  by_confidence: Record<string, AccuracyBucket>;
  window_start_iso: string;
}

/** GET /stats/accuracy — overall, rolling 30d, methodology */
export interface AccuracyResponse extends AccuracyBucket {
  by_league: Record<string, AccuracyBucket>;
  by_confidence: Record<string, AccuracyBucket>;
  rolling_30d: AccuracyRollingWindow;
  methodology: AccuracyMethodology;
  /** When this snapshot was computed (server UTC). */
  computed_at_iso?: string;
  /** Alias for total_games (API returns both). */
  total_games?: number;
}

export interface LeagueCoverageRow {
  league: string;
  standings_rows: number;
  standings_last_updated_iso: string | null;
}

export interface CoverageResponse {
  leagues: LeagueCoverageRow[];
  summary: {
    leagues_with_standings: number;
    latest_standings_sync_iso: string | null;
  };
  disclaimer: string;
}

export interface CalibrationBucket {
  bin_start: number;
  bin_end: number;
  predicted_mid: number;
  count: number;
  actual_rate: number | null;
  actual_rate_pct: number | null;
}

/** GET /stats/calibration — reliability diagram buckets */
export interface CalibrationResponse {
  total_scored: number;
  min_sample: number;
  min_sample_met: boolean;
  buckets: CalibrationBucket[];
  computed_at_iso?: string;
  methodology?: string;
}

export interface MarketOddsConsensus {
  home_moneyline?: number | null;
  away_moneyline?: number | null;
  home_implied_prob?: number | null;
  away_implied_prob?: number | null;
  spread_home?: number | null;
  spread_home_price?: number | null;
  total_points?: number | null;
  over_price?: number | null;
}

export interface MarketOddsModelComparison {
  model_home_win_prob?: number | null;
  market_home_implied_prob?: number | null;
  home_edge_pct?: number | null;
  edge_label?: 'model_leans_home' | 'model_leans_away' | 'aligned' | 'unavailable';
}

/** GET /games/:id/market-odds — consensus sportsbook lines (M-01, display only). */
export interface MarketOddsResponse {
  available: boolean;
  reason?: string | null;
  provider?: string | null;
  sport_key?: string | null;
  book_count?: number;
  consensus?: MarketOddsConsensus | null;
  model_comparison?: MarketOddsModelComparison | null;
  disclaimer?: string | null;
  fetched_at_iso?: string | null;
}

/** GET /stats/model — sklearn publish readiness (warming vs ready). */
export interface ModelStatusResponse {
  status: 'warming' | 'ready' | 'forced' | string;
  publish_ready: boolean;
  artifacts_written?: boolean;
  games?: number;
  trained_at?: string | null;
  league_counts?: Record<string, number>;
  publish_block_reasons?: string[];
  detail?: string | null;
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
    const tokenAtRequestStart = token;
    if (requireAuth && !token) {
      const err = new Error('Not authenticated') as Error & { status?: number };
      err.status = 401;
      throw err;
    }
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
        if (requireAuth && !tokenAtRequestStart) {
          throw error;
        }
        const isAuthSessionEndpoint =
          endpoint.startsWith('/auth/refresh') ||
          endpoint.startsWith('/auth/logout') ||
          endpoint.startsWith('/auth/login') ||
          endpoint.startsWith('/auth/register') ||
          endpoint.startsWith('/auth/apple');
        if (!isRetryAfterRefresh && !isAuthSessionEndpoint) {
          try {
            const stored = await getStoredAuth();
            const rt = stored?.refreshToken;
            if (rt && tokenAtRequestStart === this.getStoredToken()) {
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
        const sessionStillCurrent =
          tokenAtRequestStart != null && tokenAtRequestStart === this.getStoredToken();
        if (!isAuthSessionEndpoint && sessionStillCurrent) {
          setAuthToken(null);
          clearStoredAuth().catch(() => {});
          onUnauthorized?.();
        }
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
        const expectedMissing =
          st === 404 && /\/explanation\b/.test(endpoint);
        if (!expectedMissing) {
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
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: { email, password },
    });
  }

  async loginWithApple(body: {
    identity_token: string;
    email?: string;
    full_name?: string;
  }) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>('/auth/apple', {
      method: 'POST',
      body,
    });
  }

  async logout(refreshToken?: string, accessToken?: string) {
    return this.request('/auth/logout', {
      method: 'POST',
      body: {
        refresh_token: refreshToken,
        access_token: accessToken,
      },
      requireAuth: true,
    });
  }

  // Games
  async getUpcomingGames(params?: {
    league?: string;
    leagues?: string;
    date?: string;
    /** IANA zone (e.g. America/New_York). Send with date so the server buckets the correct local calendar day. */
    time_zone?: string;
    skip?: number;
    limit?: number;
    signal?: AbortSignal;
  }) {
    const { signal, ...rest } = params ?? {};
    const queryParams = new URLSearchParams();
    if (rest.league) queryParams.append('league', rest.league);
    if (rest.leagues) queryParams.append('leagues', rest.leagues);
    if (rest.date) queryParams.append('date', rest.date);
    if (rest.time_zone) queryParams.append('time_zone', rest.time_zone);
    if (rest.skip != null) queryParams.append('skip', rest.skip.toString());
    if (rest.limit != null) queryParams.append('limit', rest.limit.toString());

    const query = queryParams.toString();
    return this.request<{
      games: Game[];
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
    return this.request<Game>(`/games/${gameId}`, {
      requireAuth: false,
      sendAuthIfPresent: true,
    });
  }

  async getMarketOdds(gameId: string) {
    return this.request<MarketOddsResponse>(`/games/${gameId}/market-odds`, {
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
      requireAuth: false,
      sendAuthIfPresent: true,
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
    return this.request<{
      game_id: string;
      props: Array<{
        player_name: string;
        team: string;
        prop_type: string;
        predicted_value: number;
        line: number;
        unit: string;
        confidence_level?: string;
        source?: string;
      }>;
      count: number;
      has_named_players: boolean;
      disclaimer: string;
    }>(`/games/${gameId}/player-props`, {
      requireAuth: true,
    });
  }

  // User
  async getCurrentUser() {
    return this.request<User>('/user/me', {
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

  // Stats (public; trust / transparency)
  async getAccuracy() {
    return this.request<AccuracyResponse>('/stats/accuracy', { requireAuth: false });
  }

  async getCalibration() {
    return this.request<CalibrationResponse>('/stats/calibration', { requireAuth: false });
  }

  async getCoverage() {
    return this.request<CoverageResponse>('/stats/coverage', { requireAuth: false });
  }

  async getModelStatus() {
    return this.request<ModelStatusResponse>('/stats/model', { requireAuth: false });
  }

  // Feed (top picks + personalized for-you)
  private feedQueryParams(params?: {
    league?: string;
    leagues?: string;
    limit?: number;
    date?: string;
    time_zone?: string;
  }) {
    const queryParams = new URLSearchParams();
    const leagues = params?.leagues ?? params?.league;
    if (leagues) queryParams.append('leagues', leagues);
    if (params?.limit) queryParams.append('limit', String(params.limit ?? 20));
    if (params?.date) queryParams.append('date', params.date);
    if (params?.time_zone) queryParams.append('time_zone', params.time_zone);
    return queryParams.toString();
  }

  async getTopPicks(params?: {
    league?: string;
    leagues?: string;
    limit?: number;
    date?: string;
    time_zone?: string;
  }) {
    const query = this.feedQueryParams(params);
    return this.request<{ picks: TopPick[]; count: number }>(
      `/feed/top-picks${query ? `?${query}` : ''}`,
      { requireAuth: false }
    );
  }

  async getForYouFeed(params?: {
    league?: string;
    leagues?: string;
    limit?: number;
    date?: string;
    time_zone?: string;
  }) {
    const query = this.feedQueryParams(params);
    return this.request<{ picks: TopPick[]; count: number; personalized: boolean }>(
      `/feed/for-you${query ? `?${query}` : ''}`,
      { sendAuthIfPresent: true }
    );
  }

  async getPlayerPropsFeed(params?: {
    league?: string;
    leagues?: string;
    limit?: number;
    date?: string;
    time_zone?: string;
  }) {
    const query = this.feedQueryParams(params);
    return this.request<{
      items: Array<{
        game: Game;
        props: Array<{
          player_name: string;
          team: string;
          prop_type: string;
          predicted_value: number;
          line: number;
          unit: string;
          confidence_level?: string;
          source?: string;
        }>;
        prop_count: number;
        has_named_players: boolean;
      }>;
      count: number;
      disclaimer: string;
    }>(`/feed/player-props${query ? `?${query}` : ''}`, { requireAuth: true });
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
      eligible_users?: number;
      community_warming?: boolean;
      min_active_users?: number;
    }>(`/leaderboards${query ? `?${query}` : ''}`, { requireAuth: true });
  }

  async getChallenges(params?: { status?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', String(params.limit ?? 20));
    const query = queryParams.toString();
    return this.request<{ challenges: ChallengeSummary[]; count: number }>(
      `/challenges${query ? `?${query}` : ''}`,
      { requireAuth: true }
    );
  }

  async getChallenge(id: string) {
    return this.request<ChallengeSummary>(`/challenges/${id}`, { requireAuth: true });
  }

  async createChallenge(gameIds: string[]) {
    return this.request<ChallengeSummary>('/challenges', {
      method: 'POST',
      body: { game_ids: gameIds },
      requireAuth: true,
    });
  }

  // Subscription (Stripe Checkout). tier: premium = Premium, premium_plus = Pro.
  async createCheckoutSession(tier: 'premium' | 'premium_plus' = 'premium') {
    return this.request<{ url: string }>('/subscription/create-checkout', {
      method: 'POST',
      body: { tier },
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

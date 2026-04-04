/**
 * Redux slice for games and predictions
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';
import { Game, Prediction, PredictionExplanation } from '../../types';

const GAMES_CACHE_KEY = '@sport_prediction_games_cache';

interface GamesState {
  upcomingGames: Game[];
  currentGame: Game | null;
  currentPrediction: Prediction | null;
  explanation: PredictionExplanation | null;
  cachedAt: string | null;
  loading: boolean;
  loadingPrediction: boolean;
  loadingExplanation: boolean;
  error: string | null;
}

const initialState: GamesState = {
  upcomingGames: [],
  currentGame: null,
  currentPrediction: null,
  explanation: null,
  cachedAt: null,
  loading: false,
  loadingPrediction: false,
  loadingExplanation: false,
  error: null,
};

export interface GamesCachePayload {
  games: Game[];
  updatedAt: string;
}

// Async thunks
export const fetchUpcomingGames = createAsyncThunk<
  GamesCachePayload,
  | {
      league?: string;
      leagues?: string;
      date?: string;
      time_zone?: string;
      limit?: number;
      signal?: AbortSignal;
    }
  | undefined
>(
  'games/fetchUpcoming',
  async (params) => {
    const response = await apiService.getUpcomingGames(params);
    const games = (response.games ?? []) as Game[];
    const updatedAt = new Date().toISOString();
    try {
      await AsyncStorage.setItem(
        GAMES_CACHE_KEY,
        JSON.stringify({ games, updatedAt })
      );
    } catch {
      // ignore cache write errors
    }
    return { games, updatedAt };
  }
);

export const restoreGamesFromCache = createAsyncThunk<GamesCachePayload | null>(
  'games/restoreFromCache',
  async () => {
    try {
      const raw = await AsyncStorage.getItem(GAMES_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as { games?: Game[]; updatedAt?: string };
      if (!data.games || !Array.isArray(data.games) || !data.updatedAt) return null;
      return { games: data.games, updatedAt: data.updatedAt };
    } catch {
      return null;
    }
  }
);

export const fetchGameDetails = createAsyncThunk<Game, string>(
  'games/fetchDetails',
  async (gameId: string) => {
    const game = await apiService.getGame(gameId);
    return game as Game;
  }
);

export const fetchPrediction = createAsyncThunk<Prediction, string>(
  'games/fetchPrediction',
  async (gameId: string) => {
    const prediction = await apiService.getPrediction(gameId);
    return prediction as Prediction;
  }
);

export const fetchExplanation = createAsyncThunk<PredictionExplanation, { gameId: string; predictionId: string }>(
  'games/fetchExplanation',
  async ({ gameId }) => {
    const explanation = await apiService.getPredictionExplanation(gameId);
    return explanation as PredictionExplanation;
  }
);

const gamesSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    clearCurrentGame: (state) => {
      state.currentGame = null;
      state.currentPrediction = null;
      state.explanation = null;
    },
    /** Clear only prediction/explanation when navigating to another game (avoids flash of "Game not found"). */
    clearPredictionForGameChange: (state) => {
      state.currentPrediction = null;
      state.explanation = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch upcoming games
    builder
      .addCase(fetchUpcomingGames.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUpcomingGames.fulfilled, (state, action) => {
        state.loading = false;
        state.upcomingGames = action.payload?.games ?? [];
        state.cachedAt = action.payload?.updatedAt ?? null;
      })
      .addCase(fetchUpcomingGames.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch games';
      });

    // Restore from cache (offline / cold start)
    builder.addCase(restoreGamesFromCache.fulfilled, (state, action) => {
      if (action.payload) {
        state.upcomingGames = action.payload.games;
        state.cachedAt = action.payload.updatedAt;
      }
    });

    // Fetch game details
    builder
      .addCase(fetchGameDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGameDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentGame = action.payload;
      })
      .addCase(fetchGameDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch game details';
      });

    // Fetch prediction
    builder
      .addCase(fetchPrediction.pending, (state) => {
        state.loadingPrediction = true;
        state.error = null;
      })
      .addCase(fetchPrediction.fulfilled, (state, action) => {
        state.loadingPrediction = false;
        state.currentPrediction = action.payload;
      })
      .addCase(fetchPrediction.rejected, (state) => {
        state.loadingPrediction = false;
        state.currentPrediction = null;
      });

    // Fetch explanation
    builder
      .addCase(fetchExplanation.pending, (state) => {
        state.loadingExplanation = true;
        state.error = null;
      })
      .addCase(fetchExplanation.fulfilled, (state, action) => {
        state.loadingExplanation = false;
        state.explanation = action.payload;
      })
      .addCase(fetchExplanation.rejected, (state, action) => {
        state.loadingExplanation = false;
        state.error = action.error.message || 'Failed to fetch explanation';
      });
  },
});

export const { clearCurrentGame, clearPredictionForGameChange, setError } = gamesSlice.actions;
export default gamesSlice.reducer;

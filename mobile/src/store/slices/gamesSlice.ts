/**
 * Redux slice for game detail, predictions, and explanations.
 * Upcoming games lists use React Query (useUpcomingGamesQuery).
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Game, Prediction, PredictionExplanation } from '../../types';

interface GamesState {
  currentGame: Game | null;
  currentPrediction: Prediction | null;
  explanation: PredictionExplanation | null;
  loading: boolean;
  loadingPrediction: boolean;
  loadingExplanation: boolean;
  error: string | null;
}

const initialState: GamesState = {
  currentGame: null,
  currentPrediction: null,
  explanation: null,
  loading: false,
  loadingPrediction: false,
  loadingExplanation: false,
  error: null,
};

export const fetchGameDetails = createAsyncThunk<Game, string>(
  'games/fetchDetails',
  async (gameId: string) => {
    const game = await apiService.getGame(gameId);
    return game as Game;
  }
);

export const fetchPrediction = createAsyncThunk<Prediction, string>(
  'games/fetchPrediction',
  async (gameId: string, { rejectWithValue }) => {
    try {
      const prediction = await apiService.getPrediction(gameId);
      return prediction as Prediction;
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Failed to fetch prediction';
      return rejectWithValue(msg);
    }
  },
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

    builder
      .addCase(fetchPrediction.pending, (state) => {
        state.loadingPrediction = true;
        state.error = null;
      })
      .addCase(fetchPrediction.fulfilled, (state, action) => {
        state.loadingPrediction = false;
        state.currentPrediction = action.payload;
      })
      .addCase(fetchPrediction.rejected, (state, action) => {
        state.loadingPrediction = false;
        state.currentPrediction = null;
        state.error =
          (typeof action.payload === 'string' && action.payload) ||
          action.error.message ||
          'Failed to fetch prediction';
      });

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

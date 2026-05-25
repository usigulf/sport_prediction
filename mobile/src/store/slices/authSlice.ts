/**
 * Redux slice for authentication and subscription profile
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import {
  normalizeSubscriptionTier,
  type NormalizedTier,
} from '../../utils/subscription';
import type { User } from '../../types';

export interface AuthUser {
  id: string;
  email: string;
  token: string;
  subscriptionTier: NormalizedTier;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  profileLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  profileLoading: false,
};

export const fetchUserProfile = createAsyncThunk<User, void>(
  'auth/fetchUserProfile',
  async () => apiService.getCurrentUser(),
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{
        email: string;
        token: string;
        id?: string;
        subscriptionTier?: NormalizedTier;
      }>,
    ) => {
      state.user = {
        id: action.payload.id ?? state.user?.id ?? '',
        email: action.payload.email,
        token: action.payload.token,
        subscriptionTier:
          action.payload.subscriptionTier ??
          state.user?.subscriptionTier ??
          'free',
      };
      state.isAuthenticated = true;
    },
    setSubscriptionTier: (state, action: PayloadAction<NormalizedTier>) => {
      if (state.user) {
        state.user.subscriptionTier = action.payload;
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.profileLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.profileLoading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        if (state.user) {
          state.user.id = action.payload.id;
          state.user.subscriptionTier = normalizeSubscriptionTier(
            action.payload.subscription_tier,
          );
        }
      })
      .addCase(fetchUserProfile.rejected, (state) => {
        state.profileLoading = false;
      });
  },
});

export const { setUser, setSubscriptionTier, logout } = authSlice.actions;
export default authSlice.reducer;

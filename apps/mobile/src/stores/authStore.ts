import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

import type { User, Subscription } from '@/types/user';
import { apiClient } from '@/services/api/client';

const storage = new MMKV();

const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  setSubscription: (subscription: Subscription) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      subscription: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post<{
            user: User;
            access_token: string;
            refresh_token: string;
          }>('/v1/auth/login', { email, password });

          await apiClient.setTokens(data.access_token, data.refresh_token);

          // Fetch subscription
          const { data: subData } = await apiClient.get<{ data: Subscription }>(
            '/v1/subscriptions'
          );

          set({
            user: data.user,
            subscription: subData.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post<{
            user: User;
            access_token: string;
            refresh_token: string;
          }>('/v1/auth/register', { email, password });

          await apiClient.setTokens(data.access_token, data.refresh_token);

          set({
            user: data.user,
            subscription: { plan: 'free', status: 'active' } as Subscription,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.post('/v1/auth/logout');
        } catch {
          // Ignore logout errors
        }

        set({
          user: null,
          subscription: null,
          isAuthenticated: false,
        });
      },

      refreshUser: async () => {
        try {
          const { data: userData } = await apiClient.get<User>('/v1/users/me');
          const { data: subData } = await apiClient.get<{ data: Subscription }>(
            '/v1/subscriptions'
          );

          set({
            user: userData,
            subscription: subData.data,
            isAuthenticated: true,
          });
        } catch {
          set({
            user: null,
            subscription: null,
            isAuthenticated: false,
          });
        }
      },

      setUser: (user: User) => set({ user }),
      setSubscription: (subscription: Subscription) => set({ subscription }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

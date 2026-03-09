import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, clearTokens, getStoredUser, saveTokens } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  setUser: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const user = await getStoredUser();
      set({ user, isAuthenticated: !!user, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setUser: async (user, accessToken, refreshToken) => {
    await saveTokens(accessToken, refreshToken, user);
    set({ user, isAuthenticated: true });
  },

  signOut: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));

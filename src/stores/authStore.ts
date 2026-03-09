import { create } from 'zustand';
import { User } from '../types/auth';
import { authService } from '../services/auth/authService';
import { AppException } from '../utils/exceptions';
import { getAccessToken, getUserData } from '../services/storage/secureStorage';
import { authEvents } from '../utils/authEvents';
import { tokenRefreshService } from '../services/auth/tokenRefreshService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; lockedUntil?: string }>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),

  logout: async () => {
    tokenRefreshService.stop();
    // Call service to clear remote session if possible
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      // Read token and user data in parallel — cuts secure-store wait time in half
      const [token, userData] = await Promise.all([
        getAccessToken(),
        getUserData(),
      ]);

      if (token && userData) {
        set({ 
          user: JSON.parse(userData), 
          isAuthenticated: true 
        });
        tokenRefreshService.start();
      }
    } catch (error) {
      console.error('Failed to initialize auth store', error);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      set({ 
        user: response.user, 
        isAuthenticated: true 
      });
      tokenRefreshService.start();
      return { success: true };
    } catch (error: any) {
      // Check for account lockout (403 or specific code if mapped)
      if (error instanceof AppException && error.code === 'ACCOUNT_LOCKED') {
        // Here we'd need to parse lockedUntil from error details if available
        return {
          success: false,
          error: error.message
        };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  },

  updateUser: (updates) => {
    set((s) => {
      if (!s.user) return s;
      const newUser = { ...s.user, ...updates };
      // Sync to storage
      import('../services/storage/secureStorage').then(m => {
        m.setUserData(JSON.stringify(newUser));
      });
      return { user: newUser };
    });
  },
}));

// Global subscription for decoupled logout signals (e.g., from apiClient)
authEvents.subscribe(() => {
  tokenRefreshService.stop();
  useAuthStore.getState().setAuthenticated(false);
  useAuthStore.getState().setUser(null);
});

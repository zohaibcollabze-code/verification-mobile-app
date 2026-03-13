/**
 * AUTHENTICATION CONTEXT — Dual-Token Architecture
 * Provides secure access token management with automatic refresh.
 * All API calls must use getValidAccessToken() instead of direct token access.
 */
import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AuthError } from '@/types/auth';

interface AuthContextType {
  /** Returns a valid access token, refreshing if necessary */
  getValidAccessToken: () => Promise<string | null>;
  /** Force refresh of access token */
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authStore = useAuthStore();
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      // Check if we have a valid session
      if (authStore.status !== 'authenticated') {
        return null;
      }

      // Check if access token is still valid (with 30s buffer)
      const now = Date.now();
      const tokenValid = authStore.accessToken &&
        (authStore.accessToken.expiresAt > now + 30000); // 30 seconds buffer

      if (tokenValid) {
        return authStore.accessToken.token;
      }

      // Token expired, trigger refresh
      await refreshAccessToken();
      return authStore.accessToken?.token || null;
    } catch (error) {
      console.error('[AuthContext] getValidAccessToken failed:', error);
      throw error;
    }
  }, [authStore.status, authStore.accessToken]);

  const refreshAccessToken = useCallback(async (): Promise<void> => {
    // Prevent concurrent refresh attempts (refresh lock)
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        await authStore.refreshTokens();
      } catch (error) {
        // If refresh fails, logout user
        if (error instanceof AuthError && error.code === 'INVALID_REFRESH_TOKEN') {
          await authStore.logout();
        }
        throw error;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [authStore]);

  const contextValue: AuthContextType = {
    getValidAccessToken,
    refreshAccessToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
